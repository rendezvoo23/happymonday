-- Replace per-request referral credits with stackable seven-day access periods.
-- Existing credits remain usable for backwards compatibility, but new rewards
-- extend referral_access_until for both users.

ALTER TABLE public.shortcut_entitlements
    ADD COLUMN IF NOT EXISTS referral_access_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_shortcut_entitlements_referral_access_until
    ON public.shortcut_entitlements(referral_access_until);

COMMENT ON COLUMN public.shortcut_entitlements.referral_access_until IS
    'Stackable free Shortcut access earned through confirmed referrals.';

-- Convert referral rewards already issued as request credits. The conversion
-- is intentionally generous: each confirmed referral receives the new full
-- seven-day reward, even if some of the old credits were already used.
WITH reward_rows AS (
    SELECT invitee_user_id AS user_id, 1 AS reward_count
    FROM public.shortcut_referrals
    WHERE status = 'rewarded' AND invitee_user_id IS NOT NULL
    UNION ALL
    SELECT inviter_user_id AS user_id, 1 AS reward_count
    FROM public.shortcut_referrals
    WHERE status = 'rewarded' AND inviter_rewarded
), rewards AS (
    SELECT user_id, sum(reward_count)::integer AS reward_count
    FROM reward_rows
    GROUP BY user_id
)
UPDATE public.shortcut_entitlements AS entitlement
SET referral_access_until = GREATEST(
        COALESCE(entitlement.referral_access_until, statement_timestamp()),
        COALESCE(entitlement.paid_until, statement_timestamp()),
        statement_timestamp()
    ) + pg_catalog.make_interval(days => rewards.reward_count * 7),
    bonus_request_credits = 0
FROM rewards
WHERE entitlement.user_id = rewards.user_id;

CREATE OR REPLACE FUNCTION public.complete_shortcut_referral(
    p_invitee_user_id uuid
) RETURNS TABLE (
    rewarded boolean,
    inviter_telegram_id bigint,
    invitee_telegram_id bigint,
    inviter_rewarded boolean
)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
AS $$
DECLARE
    v_referral public.shortcut_referrals%ROWTYPE;
    v_invitee_telegram_id bigint;
    v_rewarded_count integer;
    v_inviter_rewarded boolean;
    v_now timestamptz := statement_timestamp();
BEGIN
    IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
        RAISE EXCEPTION 'service role required';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('shortcut-referral:' || p_invitee_user_id::text, 0)
    );

    IF (SELECT count(*) FROM public.shortcut_ingestion_requests
        WHERE user_id = p_invitee_user_id AND status = 'completed') <> 1 THEN
        RETURN QUERY SELECT false, NULL::bigint, NULL::bigint, false;
        RETURN;
    END IF;

    SELECT telegram_id INTO v_invitee_telegram_id
    FROM public.profiles WHERE id = p_invitee_user_id;
    IF v_invitee_telegram_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::bigint, NULL::bigint, false;
        RETURN;
    END IF;

    SELECT * INTO v_referral
    FROM public.shortcut_referrals
    WHERE invitee_telegram_id = v_invitee_telegram_id
      AND status = 'pending'
    FOR UPDATE;
    IF NOT FOUND OR v_referral.inviter_user_id = p_invitee_user_id THEN
        RETURN QUERY SELECT false, NULL::bigint, NULL::bigint, false;
        RETURN;
    END IF;

    SELECT count(*)::integer INTO v_rewarded_count
    FROM public.shortcut_referrals
    WHERE inviter_user_id = v_referral.inviter_user_id
      AND status = 'rewarded'
      AND inviter_rewarded;
    v_inviter_rewarded := v_rewarded_count < 20;

    INSERT INTO public.shortcut_entitlements(user_id, referral_access_until)
    VALUES (p_invitee_user_id, v_now + interval '7 days')
    ON CONFLICT (user_id) DO UPDATE
    SET referral_access_until = GREATEST(
        COALESCE(public.shortcut_entitlements.referral_access_until, v_now),
        COALESCE(public.shortcut_entitlements.paid_until, v_now),
        v_now
    ) + interval '7 days';

    IF v_inviter_rewarded THEN
        INSERT INTO public.shortcut_entitlements(user_id, referral_access_until)
        VALUES (v_referral.inviter_user_id, v_now + interval '7 days')
        ON CONFLICT (user_id) DO UPDATE
        SET referral_access_until = GREATEST(
            COALESCE(public.shortcut_entitlements.referral_access_until, v_now),
            COALESCE(public.shortcut_entitlements.paid_until, v_now),
            v_now
        ) + interval '7 days';
    END IF;

    UPDATE public.shortcut_referrals
    SET status = 'rewarded', invitee_user_id = p_invitee_user_id,
        inviter_rewarded = v_inviter_rewarded, rewarded_at = v_now
    WHERE id = v_referral.id;

    RETURN QUERY
    SELECT true, p.telegram_id, v_invitee_telegram_id, v_inviter_rewarded
    FROM public.profiles AS p
    WHERE p.id = v_referral.inviter_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_shortcut_reminders(
    p_limit integer DEFAULT 100
) RETURNS TABLE(user_id uuid, telegram_id bigint, reminder_stage smallint)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
AS $$
BEGIN
    IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
        RAISE EXCEPTION 'service role required';
    END IF;
    IF p_limit NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'invalid limit'; END IF;

    RETURN QUERY
    WITH candidates AS (
        SELECT s.user_id, p.telegram_id,
            CASE WHEN s.reminder_stage = 0 THEN 1 ELSE 2 END::smallint AS next_stage
        FROM public.shortcut_reminder_state AS s
        JOIN public.profiles AS p ON p.id = s.user_id
        JOIN public.shortcut_entitlements AS e ON e.user_id = s.user_id
        WHERE s.enabled
          AND s.reminder_stage < 2
          AND EXISTS (
              SELECT 1 FROM public.shortcut_ingestion_requests AS r
              WHERE r.user_id = s.user_id AND r.status = 'completed'
          )
          AND (e.paid_until > now() OR e.referral_access_until > now()
               OR e.bonus_request_credits > 0
               OR (e.trial_ends_at > now() AND e.trial_started_at IS NOT NULL))
          AND (
              (s.reminder_stage = 0 AND s.last_activity_at <= now() - interval '48 hours')
              OR
              (s.reminder_stage = 1 AND s.last_activity_at <= now() - interval '7 days'
               AND s.last_sent_at <= now() - interval '4 days')
          )
        ORDER BY s.last_activity_at
        FOR UPDATE OF s SKIP LOCKED
        LIMIT p_limit
    ), claimed AS (
        UPDATE public.shortcut_reminder_state AS s
        SET reminder_stage = c.next_stage, last_sent_at = now()
        FROM candidates AS c
        WHERE s.user_id = c.user_id
        RETURNING s.user_id, c.telegram_id, c.next_stage
    )
    SELECT claimed.user_id, claimed.telegram_id, claimed.next_stage
    FROM claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.begin_shortcut_ingestion(
    p_token_id uuid,
    p_user_id uuid,
    p_request_id uuid,
    p_counts_toward_quota boolean DEFAULT true,
    p_rate_limit_per_minute integer DEFAULT 15
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
    IF p_rate_limit_per_minute NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'invalid rate limit'; END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('shortcut-ingestion:' || p_user_id::text, 0));

    IF NOT EXISTS (SELECT 1 FROM public.shortcut_access_tokens AS sat
        WHERE sat.id = p_token_id AND sat.user_id = p_user_id AND sat.revoked_at IS NULL
          AND (sat.expires_at IS NULL OR sat.expires_at > v_now)) THEN
        RETURN QUERY SELECT 'unauthorized'::text, NULL::uuid, NULL::uuid; RETURN;
    END IF;

    SELECT * INTO v_existing FROM public.shortcut_ingestion_requests AS sir
    WHERE sir.token_id = p_token_id AND sir.request_id = p_request_id FOR UPDATE;
    IF FOUND AND v_existing.status = 'completed' THEN
        RETURN QUERY SELECT 'duplicate'::text, v_existing.id, v_existing.transaction_id; RETURN;
    END IF;
    IF FOUND AND v_existing.status = 'processing' AND v_existing.updated_at > v_now - interval '2 minutes' THEN
        RETURN QUERY SELECT 'processing'::text, v_existing.id, NULL::uuid; RETURN;
    END IF;

    SELECT * INTO v_entitlement FROM public.shortcut_entitlements AS se
    WHERE se.user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'access_required'::text, NULL::uuid, NULL::uuid; RETURN; END IF;

    IF p_counts_toward_quota
       AND (v_entitlement.paid_until IS NULL OR v_entitlement.paid_until <= v_now)
       AND (v_entitlement.referral_access_until IS NULL OR v_entitlement.referral_access_until <= v_now) THEN
        IF v_entitlement.trial_started_at IS NOT NULL AND v_entitlement.trial_ends_at > v_now THEN
            SELECT count(*)::integer INTO v_count FROM public.shortcut_ingestion_requests AS sir
            WHERE sir.user_id = p_user_id AND sir.counts_toward_quota
              AND sir.status IN ('processing', 'completed', 'failed')
              AND sir.created_at >= v_entitlement.trial_started_at
              AND sir.created_at <= v_entitlement.trial_ends_at
              AND (v_existing.id IS NULL OR sir.id <> v_existing.id);
            IF v_count >= v_entitlement.trial_request_limit THEN v_use_bonus := true; END IF;
        ELSE
            v_use_bonus := true;
        END IF;

        IF v_use_bonus AND NOT coalesce(v_existing.used_bonus_credit, false) THEN
            IF v_entitlement.bonus_request_credits <= 0 THEN
                RETURN QUERY SELECT 'trial_limit_reached'::text, NULL::uuid, NULL::uuid; RETURN;
            END IF;
            UPDATE public.shortcut_entitlements
            SET bonus_request_credits = bonus_request_credits - 1
            WHERE user_id = p_user_id;
        END IF;
    END IF;

    SELECT count(*)::integer INTO v_count FROM public.shortcut_ingestion_requests AS sir
    WHERE sir.user_id = p_user_id AND sir.created_at >= v_now - interval '1 minute'
      AND (v_existing.id IS NULL OR sir.id <> v_existing.id);
    IF v_count >= p_rate_limit_per_minute THEN
        IF v_use_bonus AND NOT coalesce(v_existing.used_bonus_credit, false) THEN
            UPDATE public.shortcut_entitlements SET bonus_request_credits = bonus_request_credits + 1
            WHERE user_id = p_user_id;
        END IF;
        RETURN QUERY SELECT 'rate_limited'::text, NULL::uuid, NULL::uuid; RETURN;
    END IF;

    IF v_existing.id IS NOT NULL THEN
        UPDATE public.shortcut_ingestion_requests
        SET status = 'processing', transaction_id = NULL, error_code = NULL,
            counts_toward_quota = p_counts_toward_quota,
            used_bonus_credit = used_bonus_credit OR v_use_bonus, updated_at = v_now
        WHERE id = v_existing.id RETURNING id INTO v_request_row_id;
    ELSE
        INSERT INTO public.shortcut_ingestion_requests(
            token_id, user_id, request_id, counts_toward_quota, used_bonus_credit
        ) VALUES (p_token_id, p_user_id, p_request_id, p_counts_toward_quota, v_use_bonus)
        RETURNING id INTO v_request_row_id;
    END IF;
    RETURN QUERY SELECT 'ready'::text, v_request_row_id, NULL::uuid;
END;
$$;

-- Paid periods start after any already-earned referral access, so users never
-- lose free days when they subscribe before a referral period expires.
CREATE OR REPLACE FUNCTION public.fulfill_shortcut_stars_payment(
    p_user_id uuid,
    p_provider_charge_id text,
    p_payload text,
    p_amount integer,
    p_currency text,
    p_access_days integer DEFAULT 30
) RETURNS TABLE (paid_until timestamptz, duplicate boolean)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_existing public.shortcut_payments%ROWTYPE;
    v_order public.shortcut_payment_orders%ROWTYPE;
    v_current_paid_until timestamptz;
    v_referral_access_until timestamptz;
    v_new_paid_until timestamptz;
BEGIN
    IF p_amount <> 250 OR p_currency <> 'XTR' OR p_access_days <> 30 THEN
        RAISE EXCEPTION 'invalid shortcut product';
    END IF;
    IF p_provider_charge_id IS NULL
       OR char_length(p_provider_charge_id) NOT BETWEEN 8 AND 180
       OR p_payload IS NULL
       OR char_length(p_payload) NOT BETWEEN 16 AND 180 THEN
        RAISE EXCEPTION 'invalid payment identifiers';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('shortcut-user:' || p_user_id::text, 0)
    );
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('shortcut-charge:' || p_provider_charge_id, 0)
    );

    SELECT * INTO v_existing FROM public.shortcut_payments
    WHERE provider = 'telegram_stars' AND provider_charge_id = p_provider_charge_id
    FOR UPDATE;

    IF FOUND THEN
        IF v_existing.user_id <> p_user_id OR v_existing.amount <> p_amount
           OR v_existing.currency <> p_currency OR v_existing.payload <> p_payload THEN
            RAISE EXCEPTION 'payment identity mismatch';
        END IF;
        IF v_existing.access_granted_until IS NULL THEN
            INSERT INTO public.shortcut_entitlements (user_id) VALUES (p_user_id)
            ON CONFLICT (user_id) DO NOTHING;

            SELECT se.paid_until, se.referral_access_until
            INTO v_current_paid_until, v_referral_access_until
            FROM public.shortcut_entitlements AS se
            WHERE se.user_id = p_user_id FOR UPDATE;

            v_new_paid_until := GREATEST(
                COALESCE(v_current_paid_until, statement_timestamp()),
                COALESCE(v_referral_access_until, statement_timestamp()),
                statement_timestamp()
            ) + pg_catalog.make_interval(days => p_access_days);

            UPDATE public.shortcut_entitlements SET paid_until = v_new_paid_until
            WHERE user_id = p_user_id;
            UPDATE public.shortcut_payments SET access_granted_until = v_new_paid_until
            WHERE id = v_existing.id;
        ELSE
            v_new_paid_until := v_existing.access_granted_until;
        END IF;
        RETURN QUERY SELECT v_new_paid_until, true;
        RETURN;
    END IF;

    SELECT * INTO v_order FROM public.shortcut_payment_orders
    WHERE payload = p_payload FOR UPDATE;
    IF p_payload LIKE 'whyspent_shortcut_month_v2:%' THEN
        IF NOT FOUND OR v_order.user_id <> p_user_id OR v_order.amount <> p_amount
           OR v_order.currency <> p_currency OR v_order.status <> 'pending'
           OR v_order.expires_at <= statement_timestamp() THEN
            RAISE EXCEPTION 'payment order is not valid';
        END IF;
    END IF;

    INSERT INTO public.shortcut_entitlements (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT se.paid_until, se.referral_access_until
    INTO v_current_paid_until, v_referral_access_until
    FROM public.shortcut_entitlements AS se
    WHERE se.user_id = p_user_id FOR UPDATE;

    v_new_paid_until := GREATEST(
        COALESCE(v_current_paid_until, statement_timestamp()),
        COALESCE(v_referral_access_until, statement_timestamp()),
        statement_timestamp()
    ) + pg_catalog.make_interval(days => p_access_days);

    INSERT INTO public.shortcut_payments(
        user_id, provider, provider_charge_id, payload, amount, currency,
        status, access_granted_until
    ) VALUES (
        p_user_id, 'telegram_stars', p_provider_charge_id, p_payload,
        p_amount, p_currency, 'paid', v_new_paid_until
    );
    UPDATE public.shortcut_entitlements SET paid_until = v_new_paid_until
    WHERE user_id = p_user_id;
    UPDATE public.shortcut_payment_orders
    SET status = 'paid', provider_charge_id = p_provider_charge_id
    WHERE payload = p_payload;

    RETURN QUERY SELECT v_new_paid_until, false;
END;
$$;

-- Shortcut ingestion is expense-only. The Mini App can continue supporting
-- income independently.
CREATE OR REPLACE FUNCTION public.create_shortcut_transaction(
    p_request_row_id uuid,
    p_user_id uuid,
    p_direction public.transaction_direction,
    p_amount numeric,
    p_currency_code text,
    p_category_id uuid,
    p_subcategory_id uuid,
    p_occurred_at timestamptz,
    p_note text
) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_request_id uuid;
    v_transaction_id uuid;
BEGIN
    IF p_direction <> 'expense'::public.transaction_direction THEN
        RAISE EXCEPTION 'shortcut supports expenses only';
    END IF;

    SELECT id INTO v_request_id FROM public.shortcut_ingestion_requests
    WHERE id = p_request_row_id AND user_id = p_user_id AND status = 'processing'
    FOR UPDATE;
    IF v_request_id IS NULL THEN RAISE EXCEPTION 'shortcut request is not processable'; END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.categories
        WHERE id = p_category_id AND type = 'expense'::public.transaction_direction
          AND (user_id IS NULL OR user_id = p_user_id) AND is_archived = false
    ) THEN RAISE EXCEPTION 'shortcut category is not allowed'; END IF;

    IF p_subcategory_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.subcategories
        WHERE id = p_subcategory_id AND category_id = p_category_id
          AND (user_id IS NULL OR user_id = p_user_id)
    ) THEN RAISE EXCEPTION 'shortcut subcategory is not allowed'; END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.currencies WHERE code = p_currency_code AND is_active = true
    ) THEN RAISE EXCEPTION 'shortcut currency is not allowed'; END IF;

    INSERT INTO public.transactions(
        user_id, direction, amount, currency_code, category_id,
        subcategory_id, occurred_at, note
    ) VALUES (
        p_user_id, 'expense'::public.transaction_direction, p_amount,
        p_currency_code, p_category_id, p_subcategory_id, p_occurred_at, p_note
    ) RETURNING id INTO v_transaction_id;

    UPDATE public.shortcut_ingestion_requests
    SET status = 'completed', transaction_id = v_transaction_id, error_code = NULL
    WHERE id = p_request_row_id;
    RETURN v_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_shortcut_referral(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_shortcut_reminders(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.begin_shortcut_ingestion(uuid, uuid, uuid, boolean, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fulfill_shortcut_stars_payment(uuid, text, text, integer, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_shortcut_transaction(uuid, uuid, public.transaction_direction, numeric, text, uuid, uuid, timestamptz, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.complete_shortcut_referral(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_shortcut_reminders(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.begin_shortcut_ingestion(uuid, uuid, uuid, boolean, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_shortcut_stars_payment(uuid, text, text, integer, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_shortcut_transaction(uuid, uuid, public.transaction_direction, numeric, text, uuid, uuid, timestamptz, text) TO service_role;
