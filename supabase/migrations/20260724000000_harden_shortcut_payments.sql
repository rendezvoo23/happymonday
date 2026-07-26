-- Make Telegram Stars fulfillment atomic and auditable.
-- A payment and its 30-day entitlement are committed in one transaction, so
-- webhook retries cannot double-credit access or leave a paid user without it.

CREATE TABLE IF NOT EXISTS "public"."shortcut_payment_orders" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "payload" text NOT NULL,
    "product" text NOT NULL DEFAULT 'shortcut_30_days',
    "amount" integer NOT NULL,
    "currency" text NOT NULL,
    "status" text NOT NULL DEFAULT 'pending',
    "expires_at" timestamp with time zone NOT NULL,
    "provider_charge_id" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "shortcut_payment_orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shortcut_payment_orders_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "shortcut_payment_orders_payload_key" UNIQUE ("payload"),
    CONSTRAINT "shortcut_payment_orders_payload_length"
        CHECK (char_length("payload") BETWEEN 16 AND 180),
    CONSTRAINT "shortcut_payment_orders_product_check"
        CHECK ("product" = 'shortcut_30_days'),
    CONSTRAINT "shortcut_payment_orders_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "shortcut_payment_orders_currency_check" CHECK ("currency" = 'XTR'),
    CONSTRAINT "shortcut_payment_orders_status_check"
        CHECK ("status" IN ('pending', 'paid', 'expired', 'cancelled'))
);

ALTER TABLE "public"."shortcut_payment_orders" OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_shortcut_payment_orders_updated_at"
    ON "public"."shortcut_payment_orders";
CREATE TRIGGER "trg_shortcut_payment_orders_updated_at"
    BEFORE UPDATE ON "public"."shortcut_payment_orders"
    FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE INDEX IF NOT EXISTS "idx_shortcut_payment_orders_user_created_at"
    ON "public"."shortcut_payment_orders" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_shortcut_payment_orders_pending_expiry"
    ON "public"."shortcut_payment_orders" ("expires_at")
    WHERE "status" = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS "idx_shortcut_payment_orders_one_pending_product"
    ON "public"."shortcut_payment_orders" ("user_id", "product")
    WHERE "status" = 'pending';

ALTER TABLE "public"."shortcut_payment_orders" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."shortcut_payment_orders" FROM PUBLIC, "anon", "authenticated";
GRANT ALL ON TABLE "public"."shortcut_payment_orders" TO "service_role";

ALTER TABLE "public"."shortcut_payments"
    ADD COLUMN IF NOT EXISTS "access_granted_until" timestamp with time zone;

-- Mark legacy rows as already fulfilled when the old webhook granted access.
-- Otherwise a delayed Telegram retry after this migration could add 30 days twice.
UPDATE "public"."shortcut_payments" AS payment
SET "access_granted_until" = entitlement."paid_until"
FROM "public"."shortcut_entitlements" AS entitlement
WHERE payment."user_id" = entitlement."user_id"
  AND payment."provider" = 'telegram_stars'
  AND payment."status" = 'paid'
  AND payment."access_granted_until" IS NULL
  AND entitlement."paid_until" IS NOT NULL;

CREATE OR REPLACE FUNCTION "public"."fulfill_shortcut_stars_payment"(
    "p_user_id" uuid,
    "p_provider_charge_id" text,
    "p_payload" text,
    "p_amount" integer,
    "p_currency" text,
    "p_access_days" integer DEFAULT 30
) RETURNS TABLE ("paid_until" timestamp with time zone, "duplicate" boolean)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
AS $$
DECLARE
    v_existing public.shortcut_payments%ROWTYPE;
    v_order public.shortcut_payment_orders%ROWTYPE;
    v_current_paid_until timestamp with time zone;
    v_new_paid_until timestamp with time zone;
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

    -- Serialize both duplicate deliveries of one charge and simultaneous
    -- purchases by the same user.
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('shortcut-user:' || p_user_id::text, 0)
    );
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('shortcut-charge:' || p_provider_charge_id, 0)
    );

    SELECT * INTO v_existing
    FROM public.shortcut_payments
    WHERE provider = 'telegram_stars'
      AND provider_charge_id = p_provider_charge_id
    FOR UPDATE;

    IF FOUND THEN
        IF v_existing.user_id <> p_user_id
           OR v_existing.amount <> p_amount
           OR v_existing.currency <> p_currency
           OR v_existing.payload <> p_payload THEN
            RAISE EXCEPTION 'payment identity mismatch';
        END IF;

        -- Repair a legacy row that may have been written before entitlement
        -- fulfillment, but never grant the same charge twice.
        IF v_existing.access_granted_until IS NULL THEN
            INSERT INTO public.shortcut_entitlements (user_id)
            VALUES (p_user_id)
            ON CONFLICT (user_id) DO NOTHING;

            SELECT se.paid_until INTO v_current_paid_until
            FROM public.shortcut_entitlements AS se
            WHERE se.user_id = p_user_id
            FOR UPDATE;

            v_new_paid_until := GREATEST(
                COALESCE(v_current_paid_until, statement_timestamp()),
                statement_timestamp()
            ) + pg_catalog.make_interval(days => p_access_days);

            UPDATE public.shortcut_entitlements
            SET paid_until = v_new_paid_until
            WHERE user_id = p_user_id;

            UPDATE public.shortcut_payments
            SET access_granted_until = v_new_paid_until
            WHERE id = v_existing.id;
        ELSE
            v_new_paid_until := v_existing.access_granted_until;
        END IF;

        RETURN QUERY SELECT v_new_paid_until, true;
        RETURN;
    END IF;

    SELECT * INTO v_order
    FROM public.shortcut_payment_orders
    WHERE payload = p_payload
    FOR UPDATE;

    IF p_payload LIKE 'whyspent_shortcut_month_v2:%' THEN
        IF NOT FOUND
           OR v_order.user_id <> p_user_id
           OR v_order.amount <> p_amount
           OR v_order.currency <> p_currency
           OR v_order.status <> 'pending'
           OR v_order.expires_at <= statement_timestamp() THEN
            RAISE EXCEPTION 'payment order is not valid';
        END IF;
    END IF;

    INSERT INTO public.shortcut_entitlements (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT se.paid_until INTO v_current_paid_until
    FROM public.shortcut_entitlements AS se
    WHERE se.user_id = p_user_id
    FOR UPDATE;

    v_new_paid_until := GREATEST(
        COALESCE(v_current_paid_until, statement_timestamp()),
        statement_timestamp()
    ) + pg_catalog.make_interval(days => p_access_days);

    INSERT INTO public.shortcut_payments (
        user_id,
        provider,
        provider_charge_id,
        payload,
        amount,
        currency,
        status,
        access_granted_until
    ) VALUES (
        p_user_id,
        'telegram_stars',
        p_provider_charge_id,
        p_payload,
        p_amount,
        p_currency,
        'paid',
        v_new_paid_until
    );

    UPDATE public.shortcut_entitlements
    SET paid_until = v_new_paid_until
    WHERE user_id = p_user_id;

    UPDATE public.shortcut_payment_orders
    SET status = 'paid', provider_charge_id = p_provider_charge_id
    WHERE payload = p_payload;

    RETURN QUERY SELECT v_new_paid_until, false;
END;
$$;

ALTER FUNCTION "public"."fulfill_shortcut_stars_payment"(
    uuid, text, text, integer, text, integer
) OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."fulfill_shortcut_stars_payment"(
    uuid, text, text, integer, text, integer
) FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fulfill_shortcut_stars_payment"(
    uuid, text, text, integer, text, integer
) TO "service_role";

COMMENT ON TABLE "public"."shortcut_payment_orders" IS
    'Server-created Telegram Stars orders used to validate pre-checkout queries.';
COMMENT ON FUNCTION "public"."fulfill_shortcut_stars_payment"(
    uuid, text, text, integer, text, integer
) IS 'Atomically records one Telegram Stars charge and extends Shortcut access once.';

-- Token creation and revocation share the same per-user lock. Concurrent taps
-- therefore cannot revoke both newly-created credentials or leave two active.
WITH ranked_tokens AS (
    SELECT id,
           row_number() OVER (
               PARTITION BY user_id
               ORDER BY created_at DESC, id DESC
           ) AS position
    FROM public.shortcut_access_tokens
    WHERE revoked_at IS NULL
)
UPDATE public.shortcut_access_tokens AS token
SET revoked_at = statement_timestamp()
FROM ranked_tokens
WHERE token.id = ranked_tokens.id
  AND ranked_tokens.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_shortcut_access_tokens_one_active_per_user"
    ON "public"."shortcut_access_tokens" ("user_id")
    WHERE "revoked_at" IS NULL;

CREATE OR REPLACE FUNCTION "public"."rotate_shortcut_access_token"(
    "p_user_id" uuid,
    "p_token_hash" text,
    "p_label" text DEFAULT 'Apple Shortcut'
) RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
AS $$
DECLARE
    v_token_id uuid;
BEGIN
    IF p_token_hash IS NULL OR char_length(p_token_hash) <> 64 THEN
        RAISE EXCEPTION 'invalid token hash';
    END IF;
    IF p_label IS NULL OR char_length(p_label) NOT BETWEEN 1 AND 80 THEN
        RAISE EXCEPTION 'invalid token label';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('shortcut-token:' || p_user_id::text, 0)
    );

    UPDATE public.shortcut_access_tokens
    SET revoked_at = statement_timestamp()
    WHERE user_id = p_user_id AND revoked_at IS NULL;

    INSERT INTO public.shortcut_access_tokens (user_id, token_hash, label)
    VALUES (p_user_id, p_token_hash, p_label)
    RETURNING id INTO v_token_id;

    RETURN v_token_id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."revoke_shortcut_access_tokens"(
    "p_user_id" uuid
) RETURNS integer
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
AS $$
DECLARE
    v_revoked integer;
BEGIN
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('shortcut-token:' || p_user_id::text, 0)
    );
    UPDATE public.shortcut_access_tokens
    SET revoked_at = statement_timestamp()
    WHERE user_id = p_user_id AND revoked_at IS NULL;
    GET DIAGNOSTICS v_revoked = ROW_COUNT;
    RETURN v_revoked;
END;
$$;

REVOKE ALL ON FUNCTION "public"."rotate_shortcut_access_token"(uuid, text, text)
    FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."revoke_shortcut_access_tokens"(uuid)
    FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."rotate_shortcut_access_token"(uuid, text, text)
    TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."revoke_shortcut_access_tokens"(uuid)
    TO "service_role";

-- Reserve an ingestion slot atomically. This closes count-then-insert races in
-- both the 10-use trial and the per-minute limiter.
ALTER TABLE "public"."shortcut_ingestion_requests"
    ADD COLUMN IF NOT EXISTS "counts_toward_quota" boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION "public"."begin_shortcut_ingestion"(
    "p_token_id" uuid,
    "p_user_id" uuid,
    "p_request_id" uuid,
    "p_counts_toward_quota" boolean DEFAULT true,
    "p_rate_limit_per_minute" integer DEFAULT 15
) RETURNS TABLE (
    "outcome" text,
    "request_row_id" uuid,
    "existing_transaction_id" uuid
)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
AS $$
DECLARE
    v_entitlement public.shortcut_entitlements%ROWTYPE;
    v_existing public.shortcut_ingestion_requests%ROWTYPE;
    v_request_row_id uuid;
    v_count integer;
    v_now timestamp with time zone := statement_timestamp();
BEGIN
    IF p_rate_limit_per_minute NOT BETWEEN 1 AND 120 THEN
        RAISE EXCEPTION 'invalid rate limit';
    END IF;

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
    WHERE sir.token_id = p_token_id
      AND sir.request_id = p_request_id
    FOR UPDATE;

    IF FOUND AND v_existing.status = 'completed' THEN
        RETURN QUERY
            SELECT 'duplicate'::text, v_existing.id, v_existing.transaction_id;
        RETURN;
    END IF;
    IF FOUND
       AND v_existing.status = 'processing'
       AND v_existing.updated_at > v_now - interval '2 minutes' THEN
        RETURN QUERY
            SELECT 'processing'::text, v_existing.id, NULL::uuid;
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

    IF v_entitlement.paid_until IS NULL OR v_entitlement.paid_until <= v_now THEN
        IF v_entitlement.trial_started_at IS NULL
           OR v_entitlement.trial_ends_at IS NULL THEN
            RETURN QUERY SELECT 'access_required'::text, NULL::uuid, NULL::uuid;
            RETURN;
        END IF;
        IF v_entitlement.trial_ends_at <= v_now THEN
            RETURN QUERY SELECT 'trial_limit_reached'::text, NULL::uuid, NULL::uuid;
            RETURN;
        END IF;

        IF p_counts_toward_quota THEN
            SELECT count(*)::integer INTO v_count
            FROM public.shortcut_ingestion_requests AS sir
            WHERE sir.user_id = p_user_id
              AND sir.counts_toward_quota
              AND sir.status IN ('processing', 'completed', 'failed')
              AND sir.created_at >= v_entitlement.trial_started_at
              AND sir.created_at <= v_entitlement.trial_ends_at
              AND (v_existing.id IS NULL OR sir.id <> v_existing.id);
            IF v_count >= v_entitlement.trial_request_limit THEN
                RETURN QUERY
                    SELECT 'trial_limit_reached'::text, NULL::uuid, NULL::uuid;
                RETURN;
            END IF;
        END IF;
    END IF;

    SELECT count(*)::integer INTO v_count
    FROM public.shortcut_ingestion_requests AS sir
    WHERE sir.user_id = p_user_id
      AND sir.created_at >= v_now - interval '1 minute'
      AND (v_existing.id IS NULL OR sir.id <> v_existing.id);
    IF v_count >= p_rate_limit_per_minute THEN
        RETURN QUERY SELECT 'rate_limited'::text, NULL::uuid, NULL::uuid;
        RETURN;
    END IF;

    IF v_existing.id IS NOT NULL THEN
        UPDATE public.shortcut_ingestion_requests
        SET status = 'processing',
            transaction_id = NULL,
            error_code = NULL,
            counts_toward_quota = p_counts_toward_quota,
            updated_at = v_now
        WHERE id = v_existing.id
        RETURNING id INTO v_request_row_id;
    ELSE
        INSERT INTO public.shortcut_ingestion_requests (
            token_id,
            user_id,
            request_id,
            counts_toward_quota
        ) VALUES (
            p_token_id,
            p_user_id,
            p_request_id,
            p_counts_toward_quota
        ) RETURNING id INTO v_request_row_id;
    END IF;

    RETURN QUERY SELECT 'ready'::text, v_request_row_id, NULL::uuid;
END;
$$;

ALTER FUNCTION "public"."begin_shortcut_ingestion"(
    uuid, uuid, uuid, boolean, integer
) OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."begin_shortcut_ingestion"(
    uuid, uuid, uuid, boolean, integer
) FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."begin_shortcut_ingestion"(
    uuid, uuid, uuid, boolean, integer
) TO "service_role";

COMMENT ON FUNCTION "public"."begin_shortcut_ingestion"(
    uuid, uuid, uuid, boolean, integer
) IS 'Atomically validates Shortcut access, reserves trial quota, rate-limits, and starts an idempotent request.';

-- Enforce the same ownership and category/subcategory invariants for Mini App
-- writes that the Shortcut RPC already enforces.
CREATE OR REPLACE FUNCTION "public"."validate_transaction_relations"()
RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
AS $$
DECLARE
    v_category public.categories%ROWTYPE;
    v_subcategory public.subcategories%ROWTYPE;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.currencies AS c
        WHERE c.code = NEW.currency_code AND c.is_active
    ) THEN
        RAISE EXCEPTION 'transaction currency is not active';
    END IF;

    IF NEW.category_id IS NULL THEN
        IF NEW.subcategory_id IS NOT NULL THEN
            RAISE EXCEPTION 'subcategory requires category';
        END IF;
        RETURN NEW;
    END IF;

    SELECT * INTO v_category
    FROM public.categories AS c
    WHERE c.id = NEW.category_id;
    IF NOT FOUND
       OR v_category.is_archived
       OR v_category.type <> NEW.direction
       OR (v_category.user_id IS NOT NULL AND v_category.user_id <> NEW.user_id) THEN
        RAISE EXCEPTION 'transaction category is not allowed';
    END IF;

    IF NEW.subcategory_id IS NOT NULL THEN
        SELECT * INTO v_subcategory
        FROM public.subcategories AS s
        WHERE s.id = NEW.subcategory_id;
        IF NOT FOUND
           OR v_subcategory.category_id <> NEW.category_id
           OR (v_subcategory.user_id IS NOT NULL AND v_subcategory.user_id <> NEW.user_id) THEN
            RAISE EXCEPTION 'transaction subcategory is not allowed';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_validate_transaction_relations"
    ON "public"."transactions";
CREATE TRIGGER "trg_validate_transaction_relations"
    BEFORE INSERT OR UPDATE OF user_id, direction, currency_code, category_id, subcategory_id
    ON "public"."transactions"
    FOR EACH ROW EXECUTE FUNCTION "public"."validate_transaction_relations"();

CREATE OR REPLACE FUNCTION "public"."validate_subcategory_category"()
RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
AS $$
DECLARE
    v_category public.categories%ROWTYPE;
BEGIN
    SELECT * INTO v_category
    FROM public.categories AS c
    WHERE c.id = NEW.category_id;
    IF NOT FOUND
       OR v_category.is_archived
       OR (v_category.user_id IS NOT NULL AND v_category.user_id <> NEW.user_id) THEN
        RAISE EXCEPTION 'subcategory category is not allowed';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_validate_subcategory_category"
    ON "public"."subcategories";
CREATE TRIGGER "trg_validate_subcategory_category"
    BEFORE INSERT OR UPDATE OF user_id, category_id
    ON "public"."subcategories"
    FOR EACH ROW EXECUTE FUNCTION "public"."validate_subcategory_category"();

REVOKE ALL ON FUNCTION "public"."validate_transaction_relations"()
    FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."validate_subcategory_category"()
    FROM PUBLIC, "anon", "authenticated";

-- Some production projects already received the note-length check through an
-- earlier manual change.  Keep the migration re-runnable in that state.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint
        WHERE conrelid = 'public.transactions'::regclass
          AND conname = 'transactions_note_length'
    ) THEN
        ALTER TABLE "public"."transactions"
            ADD CONSTRAINT "transactions_note_length"
            CHECK (note IS NULL OR char_length(note) <= 240) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint
        WHERE conrelid = 'public.categories'::regclass
          AND conname = 'categories_name_length'
    ) THEN
        ALTER TABLE "public"."categories"
            ADD CONSTRAINT "categories_name_length"
            CHECK (char_length(name) BETWEEN 1 AND 80) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint
        WHERE conrelid = 'public.subcategories'::regclass
          AND conname = 'subcategories_name_length'
    ) THEN
        ALTER TABLE "public"."subcategories"
            ADD CONSTRAINT "subcategories_name_length"
            CHECK (char_length(name) BETWEEN 1 AND 80) NOT VALID;
    END IF;
END;
$$;

-- RLS already protects these tables; remove unnecessary anonymous grants and
-- make future objects private unless explicitly granted.
REVOKE ALL ON TABLE "public"."profiles", "public"."transactions",
    "public"."user_settings", "public"."categories", "public"."subcategories"
    FROM "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
    REVOKE ALL ON TABLES FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, "anon", "authenticated";
