-- Add subcategory support to Shortcut ingestion. This migration only replaces
-- the server-side RPC used by the Edge Function; it does not alter tables.

CREATE OR REPLACE FUNCTION "public"."create_shortcut_transaction"(
    "p_request_row_id" "uuid",
    "p_user_id" "uuid",
    "p_direction" "public"."transaction_direction",
    "p_amount" numeric,
    "p_currency_code" "text",
    "p_category_id" "uuid",
    "p_subcategory_id" "uuid",
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

    IF p_subcategory_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.subcategories
        WHERE id = p_subcategory_id
          AND category_id = p_category_id
          AND (user_id IS NULL OR user_id = p_user_id)
    ) THEN
        RAISE EXCEPTION 'shortcut subcategory is not allowed';
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
        subcategory_id,
        occurred_at,
        note
    ) VALUES (
        p_user_id,
        p_direction,
        p_amount,
        p_currency_code,
        p_category_id,
        p_subcategory_id,
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
    "uuid", "uuid", timestamp with time zone, "text"
) OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."create_shortcut_transaction"(
    "uuid", "uuid", "public"."transaction_direction", numeric, "text",
    "uuid", "uuid", timestamp with time zone, "text"
) FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."create_shortcut_transaction"(
    "uuid", "uuid", "public"."transaction_direction", numeric, "text",
    "uuid", "uuid", timestamp with time zone, "text"
) TO "service_role";
