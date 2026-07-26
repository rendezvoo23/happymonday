-- Isolated storage for Apple Shortcut authentication and idempotency.
-- This migration is intentionally additive: it does not alter existing tables,
-- columns, constraints, policies, or application behavior.

CREATE TABLE IF NOT EXISTS "public"."shortcut_access_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_hash" "text" NOT NULL,
    "label" "text" DEFAULT 'Apple Shortcut'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_used_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "shortcut_access_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shortcut_access_tokens_token_hash_key" UNIQUE ("token_hash"),
    CONSTRAINT "shortcut_access_tokens_label_length" CHECK (
        char_length("label") BETWEEN 1 AND 80
    )
);

ALTER TABLE "public"."shortcut_access_tokens" OWNER TO "postgres";

ALTER TABLE ONLY "public"."shortcut_access_tokens"
    ADD CONSTRAINT "shortcut_access_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_shortcut_access_tokens_active_hash"
    ON "public"."shortcut_access_tokens" USING "btree" ("token_hash")
    WHERE "revoked_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_shortcut_access_tokens_user_created_at"
    ON "public"."shortcut_access_tokens" USING "btree" ("user_id", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "public"."shortcut_ingestion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "request_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "transaction_id" "uuid",
    "error_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "shortcut_ingestion_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shortcut_ingestion_requests_token_request_key" UNIQUE ("token_id", "request_id"),
    CONSTRAINT "shortcut_ingestion_requests_status_check" CHECK (
        "status" IN ('processing', 'completed', 'failed')
    ),
    CONSTRAINT "shortcut_ingestion_requests_error_code_length" CHECK (
        "error_code" IS NULL OR char_length("error_code") <= 80
    )
);

ALTER TABLE "public"."shortcut_ingestion_requests" OWNER TO "postgres";

ALTER TABLE ONLY "public"."shortcut_ingestion_requests"
    ADD CONSTRAINT "shortcut_ingestion_requests_token_id_fkey"
    FOREIGN KEY ("token_id") REFERENCES "public"."shortcut_access_tokens"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."shortcut_ingestion_requests"
    ADD CONSTRAINT "shortcut_ingestion_requests_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."shortcut_ingestion_requests"
    ADD CONSTRAINT "shortcut_ingestion_requests_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_shortcut_ingestion_requests_token_created_at"
    ON "public"."shortcut_ingestion_requests" USING "btree" ("token_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_shortcut_ingestion_requests_user_created_at"
    ON "public"."shortcut_ingestion_requests" USING "btree" ("user_id", "created_at" DESC);

CREATE OR REPLACE TRIGGER "trg_shortcut_ingestion_requests_updated_at"
    BEFORE UPDATE ON "public"."shortcut_ingestion_requests"
    FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

-- Insert the transaction and complete its idempotency record atomically. A
-- crash cannot leave a saved transaction behind a permanently "processing"
-- request, which would otherwise make a retry ambiguous.
CREATE OR REPLACE FUNCTION "public"."create_shortcut_transaction"(
    "p_request_row_id" "uuid",
    "p_user_id" "uuid",
    "p_direction" "public"."transaction_direction",
    "p_amount" numeric,
    "p_currency_code" "text",
    "p_category_id" "uuid",
    "p_occurred_at" timestamp with time zone,
    "p_note" "text"
) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    SET "search_path" = ''
    AS $$
DECLARE
    v_request_id uuid;
    v_transaction_id uuid;
BEGIN
    SELECT id INTO v_request_id
    FROM public.shortcut_ingestion_requests
    WHERE id = p_request_row_id
      AND user_id = p_user_id
      AND status = 'processing'
    FOR UPDATE;

    IF v_request_id IS NULL THEN
        RAISE EXCEPTION 'shortcut request is not processable';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.categories
        WHERE id = p_category_id
          AND type = p_direction
          AND (user_id IS NULL OR user_id = p_user_id)
          AND is_archived = false
    ) THEN
        RAISE EXCEPTION 'shortcut category is not allowed';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.currencies
        WHERE code = p_currency_code AND is_active = true
    ) THEN
        RAISE EXCEPTION 'shortcut currency is not allowed';
    END IF;

    INSERT INTO public.transactions (
        user_id,
        direction,
        amount,
        currency_code,
        category_id,
        occurred_at,
        note
    ) VALUES (
        p_user_id,
        p_direction,
        p_amount,
        p_currency_code,
        p_category_id,
        p_occurred_at,
        p_note
    ) RETURNING id INTO v_transaction_id;

    UPDATE public.shortcut_ingestion_requests
    SET status = 'completed', transaction_id = v_transaction_id, error_code = NULL
    WHERE id = p_request_row_id;

    RETURN v_transaction_id;
END;
$$;

ALTER FUNCTION "public"."create_shortcut_transaction"(
    "uuid", "uuid", "public"."transaction_direction", numeric, "text",
    "uuid", timestamp with time zone, "text"
) OWNER TO "postgres";

-- These tables contain authentication material and server-side operational state.
-- No client role receives direct access, even though this project has permissive
-- default table grants inherited from its original schema.
ALTER TABLE "public"."shortcut_access_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."shortcut_ingestion_requests" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."shortcut_access_tokens" FROM "anon", "authenticated";
REVOKE ALL ON TABLE "public"."shortcut_ingestion_requests" FROM "anon", "authenticated";
GRANT ALL ON TABLE "public"."shortcut_access_tokens" TO "service_role";
GRANT ALL ON TABLE "public"."shortcut_ingestion_requests" TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_shortcut_transaction"(
    "uuid", "uuid", "public"."transaction_direction", numeric, "text",
    "uuid", timestamp with time zone, "text"
) FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."create_shortcut_transaction"(
    "uuid", "uuid", "public"."transaction_direction", numeric, "text",
    "uuid", timestamp with time zone, "text"
) TO "service_role";

COMMENT ON TABLE "public"."shortcut_access_tokens" IS
    'Hashed, revocable credentials used only by the server-side Shortcut ingestion endpoint.';

COMMENT ON COLUMN "public"."shortcut_access_tokens"."token_hash" IS
    'HMAC-SHA-256 digest. The plaintext credential is never stored.';

COMMENT ON TABLE "public"."shortcut_ingestion_requests" IS
    'Idempotency records. Raw user input is deliberately not retained here.';
