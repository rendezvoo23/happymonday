-- Paid access and trial state for Apple Shortcut.
-- Tokens identify a device/user, while this table decides whether Shortcut
-- ingestion is currently allowed.

CREATE TABLE IF NOT EXISTS "public"."shortcut_entitlements" (
    "user_id" "uuid" NOT NULL,
    "trial_started_at" timestamp with time zone,
    "trial_ends_at" timestamp with time zone,
    "trial_request_limit" integer DEFAULT 10 NOT NULL,
    "paid_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "shortcut_entitlements_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "shortcut_entitlements_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "shortcut_entitlements_trial_limit_check"
        CHECK ("trial_request_limit" BETWEEN 0 AND 1000)
);

ALTER TABLE "public"."shortcut_entitlements" OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_shortcut_entitlements_updated_at" ON "public"."shortcut_entitlements";

CREATE TRIGGER "trg_shortcut_entitlements_updated_at"
    BEFORE UPDATE ON "public"."shortcut_entitlements"
    FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE INDEX IF NOT EXISTS "idx_shortcut_entitlements_paid_until"
    ON "public"."shortcut_entitlements" USING "btree" ("paid_until");

CREATE TABLE IF NOT EXISTS "public"."shortcut_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "provider_charge_id" "text",
    "payload" "text" NOT NULL,
    "amount" integer NOT NULL,
    "currency" "text" NOT NULL,
    "status" "text" DEFAULT 'paid'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "shortcut_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shortcut_payments_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "shortcut_payments_provider_check"
        CHECK ("provider" IN ('telegram_stars', 'sbp', 'crypto')),
    CONSTRAINT "shortcut_payments_status_check"
        CHECK ("status" IN ('pending', 'paid', 'failed', 'refunded')),
    CONSTRAINT "shortcut_payments_amount_check"
        CHECK ("amount" > 0),
    CONSTRAINT "shortcut_payments_currency_length"
        CHECK (char_length("currency") BETWEEN 3 AND 12)
);

ALTER TABLE "public"."shortcut_payments" OWNER TO "postgres";

CREATE UNIQUE INDEX IF NOT EXISTS "idx_shortcut_payments_provider_charge"
    ON "public"."shortcut_payments" ("provider", "provider_charge_id")
    WHERE "provider_charge_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_shortcut_payments_user_created_at"
    ON "public"."shortcut_payments" USING "btree" ("user_id", "created_at" DESC);

ALTER TABLE "public"."shortcut_entitlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."shortcut_payments" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."shortcut_entitlements" FROM "anon", "authenticated";
REVOKE ALL ON TABLE "public"."shortcut_payments" FROM "anon", "authenticated";
GRANT ALL ON TABLE "public"."shortcut_entitlements" TO "service_role";
GRANT ALL ON TABLE "public"."shortcut_payments" TO "service_role";

COMMENT ON TABLE "public"."shortcut_entitlements" IS
    'Server-side trial and paid access state for Apple Shortcut.';

COMMENT ON TABLE "public"."shortcut_payments" IS
    'Payment log for Shortcut access. Providers are intentionally separated for Telegram Stars, SBP, and crypto.';
