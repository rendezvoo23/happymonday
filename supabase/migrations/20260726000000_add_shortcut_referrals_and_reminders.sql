-- Referral credits, low-frequency inactivity reminders, and bot media settings.
-- All mutable data is service-role only; public clients cannot grant credits.

ALTER TABLE public.shortcut_entitlements
    ADD COLUMN IF NOT EXISTS bonus_request_credits integer NOT NULL DEFAULT 0;

ALTER TABLE public.shortcut_entitlements
    DROP CONSTRAINT IF EXISTS shortcut_entitlements_bonus_credits_check;
ALTER TABLE public.shortcut_entitlements
    ADD CONSTRAINT shortcut_entitlements_bonus_credits_check
    CHECK (bonus_request_credits BETWEEN 0 AND 1000);

ALTER TABLE public.shortcut_ingestion_requests
    ADD COLUMN IF NOT EXISTS used_bonus_credit boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.shortcut_referral_codes (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    code text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT shortcut_referral_codes_code_check
        CHECK (code ~ '^[A-Za-z0-9_-]{8,32}$')
);

CREATE TABLE IF NOT EXISTS public.shortcut_referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitee_telegram_id bigint NOT NULL UNIQUE,
    invitee_user_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'rewarded', 'rejected')),
    inviter_rewarded boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    rewarded_at timestamptz,
    CONSTRAINT shortcut_referrals_not_self_check
        CHECK (invitee_user_id IS NULL OR invitee_user_id <> inviter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_shortcut_referrals_inviter_status
    ON public.shortcut_referrals(inviter_user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.shortcut_reminder_state (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    enabled boolean NOT NULL DEFAULT true,
    last_activity_at timestamptz NOT NULL DEFAULT now(),
    reminder_stage smallint NOT NULL DEFAULT 0 CHECK (reminder_stage BETWEEN 0 AND 2),
    last_sent_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_shortcut_reminder_state_updated_at
    ON public.shortcut_reminder_state;
CREATE TRIGGER trg_shortcut_reminder_state_updated_at
    BEFORE UPDATE ON public.shortcut_reminder_state
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.bot_settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bot_settings_key_check CHECK (key ~ '^[a-z0-9_]{1,64}$'),
    CONSTRAINT bot_settings_value_length_check CHECK (char_length(value) BETWEEN 1 AND 2048)
);

DROP TRIGGER IF EXISTS trg_bot_settings_updated_at ON public.bot_settings;
CREATE TRIGGER trg_bot_settings_updated_at
    BEFORE UPDATE ON public.bot_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.shortcut_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortcut_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortcut_reminder_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.shortcut_referral_codes FROM anon, authenticated;
REVOKE ALL ON TABLE public.shortcut_referrals FROM anon, authenticated;
REVOKE ALL ON TABLE public.shortcut_reminder_state FROM anon, authenticated;
REVOKE ALL ON TABLE public.bot_settings FROM anon, authenticated;
GRANT ALL ON TABLE public.shortcut_referral_codes TO service_role;
GRANT ALL ON TABLE public.shortcut_referrals TO service_role;
GRANT ALL ON TABLE public.shortcut_reminder_state TO service_role;
GRANT ALL ON TABLE public.bot_settings TO service_role;

CREATE OR REPLACE FUNCTION public.get_or_create_shortcut_referral_code(
    p_user_id uuid
) RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
AS $$
DECLARE
    v_code text;
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'service role required';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'profile not found';
    END IF;

    SELECT code INTO v_code
    FROM public.shortcut_referral_codes
    WHERE user_id = p_user_id;
    IF v_code IS NOT NULL THEN
        RETURN v_code;
    END IF;

    LOOP
        v_code := replace(replace(rtrim(encode(extensions.gen_random_bytes(9), 'base64'), '='), '+', '-'), '/', '_');
        BEGIN
            INSERT INTO public.shortcut_referral_codes(user_id, code)
            VALUES (p_user_id, v_code);
            RETURN v_code;
        EXCEPTION WHEN unique_violation THEN
            SELECT code INTO v_code
            FROM public.shortcut_referral_codes
            WHERE user_id = p_user_id;
            IF v_code IS NOT NULL THEN RETURN v_code; END IF;
        END;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_shortcut_referral(
    p_invitee_telegram_id bigint,
    p_code text
) RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
AS $$
DECLARE
    v_inviter_user_id uuid;
    v_inviter_telegram_id bigint;
    v_invitee_user_id uuid;
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'service role required';
    END IF;
    IF p_invitee_telegram_id <= 0 OR p_code !~ '^[A-Za-z0-9_-]{8,32}$' THEN
        RETURN 'invalid';
    END IF;

    SELECT src.user_id, p.telegram_id
    INTO v_inviter_user_id, v_inviter_telegram_id
    FROM public.shortcut_referral_codes AS src
    JOIN public.profiles AS p ON p.id = src.user_id
    WHERE src.code = p_code;
    IF v_inviter_user_id IS NULL THEN RETURN 'invalid'; END IF;
    IF v_inviter_telegram_id = p_invitee_telegram_id THEN RETURN 'self'; END IF;

    SELECT id INTO v_invitee_user_id
    FROM public.profiles
    WHERE telegram_id = p_invitee_telegram_id;

    IF v_invitee_user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.shortcut_ingestion_requests
        WHERE user_id = v_invitee_user_id AND status = 'completed'
    ) THEN
        RETURN 'already_used';
    END IF;

    INSERT INTO public.shortcut_referrals(
        inviter_user_id, invitee_telegram_id, invitee_user_id
    ) VALUES (
        v_inviter_user_id, p_invitee_telegram_id, v_invitee_user_id
    ) ON CONFLICT (invitee_telegram_id) DO NOTHING;

    IF FOUND THEN RETURN 'registered'; END IF;
    RETURN 'already_registered';
END;
$$;

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
BEGIN
    IF auth.role() <> 'service_role' THEN
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

    INSERT INTO public.shortcut_entitlements(user_id, bonus_request_credits)
    VALUES (p_invitee_user_id, 10)
    ON CONFLICT (user_id) DO UPDATE
    SET bonus_request_credits = LEAST(1000,
        public.shortcut_entitlements.bonus_request_credits + 10);

    IF v_inviter_rewarded THEN
        INSERT INTO public.shortcut_entitlements(user_id, bonus_request_credits)
        VALUES (v_referral.inviter_user_id, 10)
        ON CONFLICT (user_id) DO UPDATE
        SET bonus_request_credits = LEAST(1000,
            public.shortcut_entitlements.bonus_request_credits + 10);
    END IF;

    UPDATE public.shortcut_referrals
    SET status = 'rewarded', invitee_user_id = p_invitee_user_id,
        inviter_rewarded = v_inviter_rewarded, rewarded_at = now()
    WHERE id = v_referral.id;

    RETURN QUERY
    SELECT true, p.telegram_id, v_invitee_telegram_id, v_inviter_rewarded
    FROM public.profiles AS p
    WHERE p.id = v_referral.inviter_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_transaction_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    INSERT INTO public.shortcut_reminder_state(
        user_id, last_activity_at, reminder_stage, last_sent_at
    ) VALUES (NEW.user_id, now(), 0, NULL)
    ON CONFLICT (user_id) DO UPDATE
    SET last_activity_at = now(), reminder_stage = 0, last_sent_at = NULL;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_track_activity ON public.transactions;
CREATE TRIGGER trg_transactions_track_activity
    AFTER INSERT ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.track_transaction_activity();

CREATE OR REPLACE FUNCTION public.claim_shortcut_reminders(
    p_limit integer DEFAULT 100
) RETURNS TABLE(user_id uuid, telegram_id bigint, reminder_stage smallint)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
AS $$
BEGIN
    IF auth.role() <> 'service_role' THEN
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
          AND (e.paid_until > now() OR e.bonus_request_credits > 0
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

-- Replace the access reservation function so bonus credits are consumed once,
-- atomically, only when trial/paid access does not cover a real request.
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

    IF p_counts_toward_quota AND (v_entitlement.paid_until IS NULL OR v_entitlement.paid_until <= v_now) THEN
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

REVOKE ALL ON FUNCTION public.get_or_create_shortcut_referral_code(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.register_shortcut_referral(bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_shortcut_referral(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_shortcut_reminders(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.begin_shortcut_ingestion(uuid, uuid, uuid, boolean, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.track_transaction_activity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_shortcut_referral_code(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.register_shortcut_referral(bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_shortcut_referral(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_shortcut_reminders(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.begin_shortcut_ingestion(uuid, uuid, uuid, boolean, integer) TO service_role;

COMMENT ON COLUMN public.shortcut_entitlements.bonus_request_credits IS
    'Non-expiring Shortcut requests granted by promotions such as referrals.';
COMMENT ON TABLE public.shortcut_referrals IS
    'One referral per invited Telegram account; reward unlocks after its first completed Shortcut ingestion.';
COMMENT ON TABLE public.shortcut_reminder_state IS
    'At most two inactivity reminders per activity cycle; stage resets on a new transaction.';
