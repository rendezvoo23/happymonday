-- Create subcategories table
CREATE TABLE IF NOT EXISTS "public"."subcategories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- Add subcategory_id column to transactions table
ALTER TABLE "public"."transactions"
    ADD COLUMN "subcategory_id" "uuid";

-- Add foreign key constraint from subcategories to categories
ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;

-- Add foreign key constraint from subcategories to profiles (for user_id)
ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Add foreign key constraint from transactions to subcategories
ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX "idx_subcategories_category_id" ON "public"."subcategories" USING "btree" ("category_id");
CREATE INDEX "idx_subcategories_user_id" ON "public"."subcategories" USING "btree" ("user_id");
CREATE INDEX "idx_subcategories_category_user" ON "public"."subcategories" USING "btree" ("category_id", "user_id");
CREATE INDEX "idx_transactions_subcategory_id" ON "public"."transactions" USING "btree" ("subcategory_id");

-- Add trigger for updated_at
CREATE OR REPLACE TRIGGER "trg_subcategories_updated_at" BEFORE UPDATE ON "public"."subcategories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

-- Enable Row Level Security
ALTER TABLE "public"."subcategories" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subcategories
-- Users can select system subcategories (user_id IS NULL) or their own
CREATE POLICY "subcategories_select_system_or_own" ON "public"."subcategories" FOR SELECT TO "authenticated" USING ((("user_id" IS NULL) OR ("user_id" = "auth"."uid"())));

-- Users can insert their own subcategories
CREATE POLICY "subcategories_insert_own" ON "public"."subcategories" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));

-- Users can update their own subcategories
CREATE POLICY "subcategories_update_own" ON "public"."subcategories" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));

-- Users can delete their own subcategories
CREATE POLICY "subcategories_delete_own" ON "public"."subcategories" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));

-- Grant permissions
GRANT ALL ON TABLE "public"."subcategories" TO "anon";
GRANT ALL ON TABLE "public"."subcategories" TO "authenticated";
GRANT ALL ON TABLE "public"."subcategories" TO "service_role";
