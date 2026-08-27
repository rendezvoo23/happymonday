-- Private operational data for the local WhySpent admin panel.
-- Tables are intentionally service-role only. The browser never connects to
-- them directly: every administrative action is validated in an Edge Function
-- and recorded in the audit log.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_telegram_id bigint NOT NULL,
    action text NOT NULL,
    target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_broadcast_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT admin_audit_log_action_length CHECK (char_length(action) BETWEEN 3 AND 80)
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
    ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user_created_at
    ON public.admin_audit_log(target_user_id, created_at DESC)
    WHERE target_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.admin_broadcasts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_telegram_id bigint NOT NULL,
    segment text NOT NULL,
    message text NOT NULL,
    audience_size integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'queued',
    sent_count integer NOT NULL DEFAULT 0,
    failed_count integer NOT NULL DEFAULT 0,
    test_sent_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT admin_broadcasts_segment_check CHECK (
        segment IN ('all', 'paid', 'trial', 'referral', 'active_7d', 'inactive_14d')
    ),
    CONSTRAINT admin_broadcasts_status_check CHECK (
        status IN ('queued', 'processing', 'completed', 'completed_with_errors', 'cancelled')
    ),
    CONSTRAINT admin_broadcasts_message_length CHECK (char_length(message) BETWEEN 1 AND 3000),
    CONSTRAINT admin_broadcasts_counts_check CHECK (
        audience_size >= 0 AND sent_count >= 0 AND failed_count >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_status_created_at
    ON public.admin_broadcasts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_broadcast_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id uuid NOT NULL REFERENCES public.admin_broadcasts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    telegram_id bigint NOT NULL,
    status text NOT NULL DEFAULT 'queued',
    attempts smallint NOT NULL DEFAULT 0,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    last_error text,
    sent_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT admin_broadcast_deliveries_status_check CHECK (
        status IN ('queued', 'sending', 'sent', 'failed')
    ),
    CONSTRAINT admin_broadcast_deliveries_attempts_check CHECK (attempts BETWEEN 0 AND 3),
    CONSTRAINT admin_broadcast_deliveries_one_user_per_broadcast UNIQUE (broadcast_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_broadcast_deliveries_claim
    ON public.admin_broadcast_deliveries(broadcast_id, status, next_attempt_at, created_at);

DROP TRIGGER IF EXISTS trg_admin_broadcast_deliveries_updated_at
    ON public.admin_broadcast_deliveries;
CREATE TRIGGER trg_admin_broadcast_deliveries_updated_at
    BEFORE UPDATE ON public.admin_broadcast_deliveries
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.admin_broadcast_tests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_telegram_id bigint NOT NULL,
    segment text NOT NULL,
    message_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT admin_broadcast_tests_segment_check CHECK (
        segment IN ('all', 'paid', 'trial', 'referral', 'active_7d', 'inactive_14d')
    ),
    CONSTRAINT admin_broadcast_tests_hash_check CHECK (message_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_admin_broadcast_tests_lookup
    ON public.admin_broadcast_tests(id, expires_at)
    WHERE used_at IS NULL;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_broadcast_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_broadcast_tests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_audit_log,
    public.admin_broadcasts,
    public.admin_broadcast_deliveries,
    public.admin_broadcast_tests
FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.admin_audit_log,
    public.admin_broadcasts,
    public.admin_broadcast_deliveries,
    public.admin_broadcast_tests
TO service_role;

CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now timestamptz := statement_timestamp();
BEGIN
    IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
        RAISE EXCEPTION 'service role required';
    END IF;

    RETURN jsonb_build_object(
        'total_users', (SELECT count(*) FROM public.profiles),
        'new_users_7d', (SELECT count(*) FROM public.profiles WHERE created_at >= v_now - interval '7 days'),
        'active_users_7d', (
            SELECT count(*)
            FROM public.shortcut_reminder_state
            WHERE last_activity_at >= v_now - interval '7 days'
        ),
        'paid_users', (
            SELECT count(*) FROM public.shortcut_entitlements
            WHERE paid_until > v_now
        ),
        'free_access_users', (
            SELECT count(*) FROM public.shortcut_entitlements
            WHERE (trial_ends_at > v_now OR referral_access_until > v_now)
              AND (paid_until IS NULL OR paid_until <= v_now)
        ),
        'shortcut_transactions_7d', (
            SELECT count(*) FROM public.shortcut_ingestion_requests
            WHERE status = 'completed' AND created_at >= v_now - interval '7 days'
        ),
        'stars_revenue_30d', (
            SELECT COALESCE(sum(amount), 0) FROM public.shortcut_payments
            WHERE provider = 'telegram_stars'
              AND status = 'paid'
              AND created_at >= v_now - interval '30 days'
        ),
        'daily_activity', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object('date', day::date, 'users', users) ORDER BY day), '[]'::jsonb)
            FROM (
                SELECT date_trunc('day', last_activity_at) AS day, count(*) AS users
                FROM public.shortcut_reminder_state
                WHERE last_activity_at >= date_trunc('day', v_now) - interval '6 days'
                GROUP BY 1
            ) activity
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_audience_members(p_segment text)
RETURNS TABLE(user_id uuid, telegram_id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
        RAISE EXCEPTION 'service role required';
    END IF;
    IF p_segment NOT IN ('all', 'paid', 'trial', 'referral', 'active_7d', 'inactive_14d') THEN
        RAISE EXCEPTION 'invalid segment';
    END IF;

    RETURN QUERY
    SELECT p.id, p.telegram_id
    FROM public.profiles AS p
    LEFT JOIN public.shortcut_entitlements AS e ON e.user_id = p.id
    LEFT JOIN public.shortcut_reminder_state AS r ON r.user_id = p.id
    WHERE CASE p_segment
        WHEN 'all' THEN true
        WHEN 'paid' THEN e.paid_until > statement_timestamp()
        WHEN 'trial' THEN e.trial_ends_at > statement_timestamp()
            AND (e.paid_until IS NULL OR e.paid_until <= statement_timestamp())
            AND (e.referral_access_until IS NULL OR e.referral_access_until <= statement_timestamp())
        WHEN 'referral' THEN e.referral_access_until > statement_timestamp()
            AND (e.paid_until IS NULL OR e.paid_until <= statement_timestamp())
        WHEN 'active_7d' THEN r.last_activity_at >= statement_timestamp() - interval '7 days'
        WHEN 'inactive_14d' THEN r.last_activity_at < statement_timestamp() - interval '14 days'
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users(
    p_search text DEFAULT NULL,
    p_segment text DEFAULT 'all',
    p_limit integer DEFAULT 25,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    id uuid,
    telegram_id bigint,
    username text,
    first_name text,
    last_name text,
    display_name text,
    created_at timestamptz,
    paid_until timestamptz,
    referral_access_until timestamptz,
    trial_ends_at timestamptz,
    trial_request_limit integer,
    last_activity_at timestamptz,
    reminders_enabled boolean,
    active_token_count bigint,
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
        RAISE EXCEPTION 'service role required';
    END IF;
    IF p_segment NOT IN ('all', 'paid', 'trial', 'referral', 'expired') THEN
        RAISE EXCEPTION 'invalid user segment';
    END IF;
    IF p_limit NOT BETWEEN 1 AND 100 OR p_offset < 0 THEN
        RAISE EXCEPTION 'invalid page';
    END IF;

    RETURN QUERY
    WITH filtered AS (
        SELECT
            p.id,
            p.telegram_id,
            p.username,
            p.first_name,
            p.last_name,
            p.display_name,
            p.created_at,
            e.paid_until,
            e.referral_access_until,
            e.trial_ends_at,
            e.trial_request_limit,
            r.last_activity_at,
            COALESCE(r.enabled, true) AS reminders_enabled,
            (
                SELECT count(*)
                FROM public.shortcut_access_tokens AS t
                WHERE t.user_id = p.id AND t.revoked_at IS NULL
            ) AS active_token_count
        FROM public.profiles AS p
        LEFT JOIN public.shortcut_entitlements AS e ON e.user_id = p.id
        LEFT JOIN public.shortcut_reminder_state AS r ON r.user_id = p.id
        WHERE (
            p_search IS NULL OR p_search = '' OR
            p.username ILIKE '%' || p_search || '%' OR
            p.first_name ILIKE '%' || p_search || '%' OR
            p.last_name ILIKE '%' || p_search || '%' OR
            p.display_name ILIKE '%' || p_search || '%' OR
            p.telegram_id::text = p_search
        )
        AND CASE p_segment
            WHEN 'all' THEN true
            WHEN 'paid' THEN e.paid_until > statement_timestamp()
            WHEN 'trial' THEN e.trial_ends_at > statement_timestamp()
                AND (e.paid_until IS NULL OR e.paid_until <= statement_timestamp())
                AND (e.referral_access_until IS NULL OR e.referral_access_until <= statement_timestamp())
            WHEN 'referral' THEN e.referral_access_until > statement_timestamp()
                AND (e.paid_until IS NULL OR e.paid_until <= statement_timestamp())
            WHEN 'expired' THEN COALESCE(e.paid_until, '-infinity'::timestamptz) <= statement_timestamp()
                AND COALESCE(e.referral_access_until, '-infinity'::timestamptz) <= statement_timestamp()
                AND COALESCE(e.trial_ends_at, '-infinity'::timestamptz) <= statement_timestamp()
        END
    )
    SELECT f.*, count(*) OVER()
    FROM filtered AS f
    ORDER BY f.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_admin_broadcast_deliveries(
    p_broadcast_id uuid,
    p_limit integer DEFAULT 20
)
RETURNS TABLE(id uuid, telegram_id bigint, message text, attempts smallint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
        RAISE EXCEPTION 'service role required';
    END IF;
    IF p_limit NOT BETWEEN 1 AND 50 THEN
        RAISE EXCEPTION 'invalid broadcast batch size';
    END IF;

    RETURN QUERY
    WITH candidates AS (
        SELECT d.id
        FROM public.admin_broadcast_deliveries AS d
        WHERE d.broadcast_id = p_broadcast_id
          AND d.status = 'queued'
          AND d.next_attempt_at <= statement_timestamp()
        ORDER BY d.created_at
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    ), claimed AS (
        UPDATE public.admin_broadcast_deliveries AS d
        SET status = 'sending', attempts = d.attempts + 1
        FROM candidates AS c
        WHERE d.id = c.id
        RETURNING d.id, d.telegram_id, d.attempts
    )
    SELECT c.id, c.telegram_id, b.message, c.attempts
    FROM claimed AS c
    JOIN public.admin_broadcasts AS b ON b.id = p_broadcast_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_metrics() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_audience_members(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_users(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_admin_broadcast_deliveries(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_audience_members(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_admin_broadcast_deliveries(uuid, integer) TO service_role;
