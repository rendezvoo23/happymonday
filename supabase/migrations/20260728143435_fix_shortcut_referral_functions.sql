-- Qualify PL/pgSQL column references that collide with RETURNS TABLE fields.
-- Also make every scalar-returning path explicit for database linting.

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
    IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
        RAISE EXCEPTION 'service role required';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles AS p WHERE p.id = p_user_id
    ) THEN
        RAISE EXCEPTION 'profile not found';
    END IF;

    SELECT src.code INTO v_code
    FROM public.shortcut_referral_codes AS src
    WHERE src.user_id = p_user_id;
    IF v_code IS NOT NULL THEN
        RETURN v_code;
    END IF;

    LOOP
        v_code := replace(
            replace(
                rtrim(encode(extensions.gen_random_bytes(9), 'base64'), '='),
                '+',
                '-'
            ),
            '/',
            '_'
        );
        BEGIN
            INSERT INTO public.shortcut_referral_codes(user_id, code)
            VALUES (p_user_id, v_code);
            RETURN v_code;
        EXCEPTION WHEN unique_violation THEN
            SELECT src.code INTO v_code
            FROM public.shortcut_referral_codes AS src
            WHERE src.user_id = p_user_id;
            IF v_code IS NOT NULL THEN
                RETURN v_code;
            END IF;
        END;
    END LOOP;

    RETURN v_code;
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
    v_now timestamptz := statement_timestamp();
BEGIN
    IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
        RAISE EXCEPTION 'service role required';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('shortcut-referral:' || p_invitee_user_id::text, 0)
    );

    IF (
        SELECT count(*)
        FROM public.shortcut_ingestion_requests AS sir
        WHERE sir.user_id = p_invitee_user_id AND sir.status = 'completed'
    ) <> 1 THEN
        RETURN QUERY SELECT false, NULL::bigint, NULL::bigint, false;
        RETURN;
    END IF;

    SELECT p.telegram_id INTO v_invitee_telegram_id
    FROM public.profiles AS p
    WHERE p.id = p_invitee_user_id;
    IF v_invitee_telegram_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::bigint, NULL::bigint, false;
        RETURN;
    END IF;

    SELECT sr.* INTO v_referral
    FROM public.shortcut_referrals AS sr
    WHERE sr.invitee_telegram_id = v_invitee_telegram_id
      AND sr.status = 'pending'
    FOR UPDATE;
    IF NOT FOUND OR v_referral.inviter_user_id = p_invitee_user_id THEN
        RETURN QUERY SELECT false, NULL::bigint, NULL::bigint, false;
        RETURN;
    END IF;

    SELECT count(*)::integer INTO v_rewarded_count
    FROM public.shortcut_referrals AS sr
    WHERE sr.inviter_user_id = v_referral.inviter_user_id
      AND sr.status = 'rewarded'
      AND sr.inviter_rewarded;
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

    UPDATE public.shortcut_referrals AS sr
    SET status = 'rewarded',
        invitee_user_id = p_invitee_user_id,
        inviter_rewarded = v_inviter_rewarded,
        rewarded_at = v_now
    WHERE sr.id = v_referral.id;

    RETURN QUERY
    SELECT true, p.telegram_id, v_invitee_telegram_id, v_inviter_rewarded
    FROM public.profiles AS p
    WHERE p.id = v_referral.inviter_user_id;
    RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_shortcut_referral_code(uuid)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_shortcut_referral_code(uuid)
    TO service_role;

REVOKE ALL ON FUNCTION public.complete_shortcut_referral(uuid)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_shortcut_referral(uuid)
    TO service_role;
