-- Add rolling per-user and global request limits to protect the AI budget.
-- The function remains service-role only; Shortcut clients cannot call it directly.

CREATE INDEX IF NOT EXISTS "idx_shortcut_ingestion_requests_created_at"
    ON "public"."shortcut_ingestion_requests" USING "btree" ("created_at" DESC);

DROP FUNCTION IF EXISTS public.begin_shortcut_ingestion(uuid, uuid, uuid, boolean, integer);

CREATE OR REPLACE FUNCTION public.begin_shortcut_ingestion(
    p_token_id uuid,
    p_user_id uuid,
    p_request_id uuid,
    p_counts_toward_quota boolean DEFAULT true,
    p_rate_limit_per_minute integer DEFAULT 15,
    p_user_daily_limit integer DEFAULT 100,
    p_global_rate_limit_per_minute integer DEFAULT 120,
    p_global_daily_limit integer DEFAULT 2000
) RETURNS TABLE(outcome text, request_row_id uuid, existing_transaction_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_entitlement public.shortcut_entitlements%ROWTYPE;
    v_existing public.shortcut_ingestion_requests%ROWTYPE;
    v_request_row_id uuid;
    v_count integer;
    v_now timestamptz := statement_timestamp();
    v_use_bonus boolean := false;
BEGIN
    IF p_rate_limit_per_minute NOT BETWEEN 1 AND 120
       OR p_user_daily_limit NOT BETWEEN 1 AND 2000
       OR p_global_rate_limit_per_minute NOT BETWEEN 1 AND 5000
       OR p_global_daily_limit NOT BETWEEN 1 AND 1000000 THEN
        RAISE EXCEPTION 'invalid shortcut rate limit';
    END IF;

    -- Serialize requests for one user so concurrent calls cannot bypass quota.
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('shortcut-ingestion:' || p_user_id::text, 0)
    );

    IF NOT EXISTS (
        SELECT 1
        FROM public.shortcut_access_tokens AS sat
        WHERE sat.id = p_token_id
          AND sat.user_id = p_user_id
          AND sat.revoked_at IS NULL
          AND (sat.expires_at IS NULL OR sat.expires_at > v_now)
    ) THEN
        RETURN QUERY SELECT 'unauthorized'::text, NULL::uuid, NULL::uuid;
        RETURN;
    END IF;

    SELECT * INTO v_existing
    FROM public.shortcut_ingestion_requests AS sir
    WHERE sir.token_id = p_token_id AND sir.request_id = p_request_id
    FOR UPDATE;

    IF FOUND AND v_existing.status = 'completed' THEN
        RETURN QUERY SELECT 'duplicate'::text, v_existing.id, v_existing.transaction_id;
        RETURN;
    END IF;
    IF FOUND AND v_existing.status = 'processing'
       AND v_existing.updated_at > v_now - interval '2 minutes' THEN
        RETURN QUERY SELECT 'processing'::text, v_existing.id, NULL::uuid;
        RETURN;
    END IF;

    SELECT * INTO v_entitlement
    FROM public.shortcut_entitlements AS se
    WHERE se.user_id = p_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'access_required'::text, NULL::uuid, NULL::uuid;
        RETURN;
    END IF;

    IF p_counts_toward_quota
       AND (v_entitlement.paid_until IS NULL OR v_entitlement.paid_until <= v_now)
       AND (v_entitlement.referral_access_until IS NULL OR v_entitlement.referral_access_until <= v_now) THEN
        IF v_entitlement.trial_started_at IS NOT NULL
           AND v_entitlement.trial_ends_at > v_now THEN
            SELECT count(*)::integer INTO v_count
            FROM public.shortcut_ingestion_requests AS sir
            WHERE sir.user_id = p_user_id
              AND sir.counts_toward_quota
              AND sir.status IN ('processing', 'completed', 'failed')
              AND sir.created_at >= v_entitlement.trial_started_at
              AND sir.created_at <= v_entitlement.trial_ends_at
              AND (v_existing.id IS NULL OR sir.id <> v_existing.id);
            IF v_count >= v_entitlement.trial_request_limit THEN
                v_use_bonus := true;
            END IF;
        ELSE
            v_use_bonus := true;
        END IF;

        IF v_use_bonus AND NOT coalesce(v_existing.used_bonus_credit, false) THEN
            IF v_entitlement.bonus_request_credits <= 0 THEN
                RETURN QUERY SELECT 'trial_limit_reached'::text, NULL::uuid, NULL::uuid;
                RETURN;
            END IF;
            UPDATE public.shortcut_entitlements
            SET bonus_request_credits = bonus_request_credits - 1
            WHERE user_id = p_user_id;
        END IF;
    END IF;

    SELECT count(*)::integer INTO v_count
    FROM public.shortcut_ingestion_requests AS sir
    WHERE sir.user_id = p_user_id
      AND sir.created_at >= v_now - interval '1 minute'
      AND (v_existing.id IS NULL OR sir.id <> v_existing.id);
    IF v_count >= p_rate_limit_per_minute THEN
        IF v_use_bonus AND NOT coalesce(v_existing.used_bonus_credit, false) THEN
            UPDATE public.shortcut_entitlements
            SET bonus_request_credits = bonus_request_credits + 1
            WHERE user_id = p_user_id;
        END IF;
        RETURN QUERY SELECT 'rate_limited'::text, NULL::uuid, NULL::uuid;
        RETURN;
    END IF;

    SELECT count(*)::integer INTO v_count
    FROM public.shortcut_ingestion_requests AS sir
    WHERE sir.user_id = p_user_id
      AND sir.created_at >= v_now - interval '24 hours'
      AND (v_existing.id IS NULL OR sir.id <> v_existing.id);
    IF v_count >= p_user_daily_limit THEN
        IF v_use_bonus AND NOT coalesce(v_existing.used_bonus_credit, false) THEN
            UPDATE public.shortcut_entitlements
            SET bonus_request_credits = bonus_request_credits + 1
            WHERE user_id = p_user_id;
        END IF;
        RETURN QUERY SELECT 'daily_limit_reached'::text, NULL::uuid, NULL::uuid;
        RETURN;
    END IF;

    -- Serialize only the short global accounting section. This makes the
    -- platform-wide limits reliable even when many users call concurrently.
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('shortcut-ingestion:global', 0)
    );

    SELECT count(*)::integer INTO v_count
    FROM public.shortcut_ingestion_requests AS sir
    WHERE sir.created_at >= v_now - interval '1 minute'
      AND (v_existing.id IS NULL OR sir.id <> v_existing.id);
    IF v_count >= p_global_rate_limit_per_minute THEN
        IF v_use_bonus AND NOT coalesce(v_existing.used_bonus_credit, false) THEN
            UPDATE public.shortcut_entitlements
            SET bonus_request_credits = bonus_request_credits + 1
            WHERE user_id = p_user_id;
        END IF;
        RETURN QUERY SELECT 'capacity_limited'::text, NULL::uuid, NULL::uuid;
        RETURN;
    END IF;

    SELECT count(*)::integer INTO v_count
    FROM public.shortcut_ingestion_requests AS sir
    WHERE sir.created_at >= v_now - interval '24 hours'
      AND (v_existing.id IS NULL OR sir.id <> v_existing.id);
    IF v_count >= p_global_daily_limit THEN
        IF v_use_bonus AND NOT coalesce(v_existing.used_bonus_credit, false) THEN
            UPDATE public.shortcut_entitlements
            SET bonus_request_credits = bonus_request_credits + 1
            WHERE user_id = p_user_id;
        END IF;
        RETURN QUERY SELECT 'capacity_limited'::text, NULL::uuid, NULL::uuid;
        RETURN;
    END IF;

    IF v_existing.id IS NOT NULL THEN
        UPDATE public.shortcut_ingestion_requests
        SET status = 'processing',
            transaction_id = NULL,
            error_code = NULL,
            counts_toward_quota = p_counts_toward_quota,
            used_bonus_credit = used_bonus_credit OR v_use_bonus,
            updated_at = v_now
        WHERE id = v_existing.id
        RETURNING id INTO v_request_row_id;
    ELSE
        INSERT INTO public.shortcut_ingestion_requests(
            token_id, user_id, request_id, counts_toward_quota, used_bonus_credit
        ) VALUES (
            p_token_id, p_user_id, p_request_id, p_counts_toward_quota, v_use_bonus
        ) RETURNING id INTO v_request_row_id;
    END IF;

    RETURN QUERY SELECT 'ready'::text, v_request_row_id, NULL::uuid;
END;
$$;

REVOKE ALL ON FUNCTION public.begin_shortcut_ingestion(
    uuid, uuid, uuid, boolean, integer, integer, integer, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_shortcut_ingestion(
    uuid, uuid, uuid, boolean, integer, integer, integer, integer
) TO service_role;
