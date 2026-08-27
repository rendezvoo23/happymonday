// Secure text-only Apple Shortcut ingestion endpoint.
// Required secrets: OPENAI_API_KEY, SHORTCUT_TOKEN_PEPPER, TELEGRAM_BOT_TOKEN.
// Set SHORTCUT_AI_MODE=mock to test without sending text to an external model.
// Deploy with JWT verification disabled: this endpoint uses a scoped, revocable token.

import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.110.8";
import {
  buildParserMessages,
  buildTransactionSchema,
  createMockParse,
  escapeTelegramHtml,
  htmlToTelegramRichMarkdown,
  htmlToTelegramMarkdownV2,
  hmacToken,
  normalizeParsedTransactionDate,
  readBearerToken,
  readShortcutBodyToken,
  validateParsedTransaction,
  validateShortcutBody,
  type CategoryOption,
  type ParsedTransaction,
  type SubcategoryOption,
} from "../_shared/shortcut.ts";

const MAX_REQUEST_BYTES = 16_384;
const RATE_LIMIT_PER_MINUTE = 15;
const USER_DAILY_LIMIT = 100;
const GLOBAL_RATE_LIMIT_PER_MINUTE = 120;
const GLOBAL_DAILY_LIMIT = 2_000;
const MIN_AUTO_SAVE_CONFIDENCE = 0.85;
const MAX_CATEGORY_OPTIONS = 50;
const MAX_SUBCATEGORY_OPTIONS = 250;

interface ShortcutEntitlement {
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_request_limit: number;
  paid_until: string | null;
  referral_access_until: string | null;
  bonus_request_credits: number;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function env(name: string): string | null {
  return Deno.env.get(name) ?? null;
}

async function markRequestFailed(
  supabase: SupabaseClient<any>,
  rowId: string,
  errorCode: string
): Promise<void> {
  await supabase
    .from("shortcut_ingestion_requests")
    .update({ status: "failed", error_code: errorCode })
    .eq("id", rowId)
    .eq("status", "processing");
}

async function checkShortcutAccess(options: {
  supabase: SupabaseClient<any>;
  userId: string;
}): Promise<
  | { ok: true }
  | {
      ok: false;
      status: number;
      errorCode: "shortcut_access_required" | "trial_limit_reached";
      message: string;
    }
> {
  const { data: entitlement, error } = await options.supabase
    .from("shortcut_entitlements")
    .select(
      "trial_started_at,trial_ends_at,trial_request_limit,paid_until,referral_access_until,bonus_request_credits"
    )
    .eq("user_id", options.userId)
    .maybeSingle();
  const shortcutEntitlement = entitlement as ShortcutEntitlement | null;
  if (error || !shortcutEntitlement) {
    return {
      ok: false,
      status: 402,
      errorCode: "shortcut_access_required",
      message: "Откройте раздел Apple Shortcut в боте и включите пробный доступ",
    };
  }

  const now = Date.now();
  if (shortcutEntitlement.paid_until && Date.parse(shortcutEntitlement.paid_until) > now) {
    return { ok: true };
  }

  if (
    shortcutEntitlement.referral_access_until &&
    Date.parse(shortcutEntitlement.referral_access_until) > now
  ) {
    return { ok: true };
  }

  if (shortcutEntitlement.bonus_request_credits > 0) {
    return { ok: true };
  }

  if (!shortcutEntitlement.trial_started_at || !shortcutEntitlement.trial_ends_at) {
    return {
      ok: false,
      status: 402,
      errorCode: "shortcut_access_required",
      message: "Откройте раздел Apple Shortcut в боте и включите пробный доступ",
    };
  }

  if (Date.parse(shortcutEntitlement.trial_ends_at) <= now) {
    return {
      ok: false,
      status: 402,
      errorCode: "trial_limit_reached",
      message: "Пробный доступ закончился. Откройте раздел Apple Shortcut в боте",
    };
  }

  const { count } = await options.supabase
    .from("shortcut_ingestion_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", options.userId)
    .eq("counts_toward_quota", true)
    .in("status", ["processing", "completed", "failed"])
    .gte("created_at", shortcutEntitlement.trial_started_at)
    .lte("created_at", shortcutEntitlement.trial_ends_at);

  if ((count ?? 0) >= shortcutEntitlement.trial_request_limit) {
    return {
      ok: false,
      status: 402,
      errorCode: "trial_limit_reached",
      message: "10 пробных добавлений закончились. Откройте раздел Apple Shortcut в боте",
    };
  }

  return { ok: true };
}

async function parseWithOpenAI(options: {
  apiKey: string;
  text: string;
  timezone: string;
  locale: string;
  defaultCurrency: string;
  categories: CategoryOption[];
  subcategories: SubcategoryOption[];
  currencies: string[];
}): Promise<ParsedTransaction> {
  const now = new Date();
  const requestBody = JSON.stringify({
    model: env("OPENAI_MODEL") || "gpt-4o-mini",
    temperature: 0,
    max_tokens: 400,
    messages: buildParserMessages({
      text: options.text,
      now: now.toISOString(),
      timezone: options.timezone,
      locale: options.locale,
      defaultCurrency: options.defaultCurrency,
      categories: options.categories,
      subcategories: options.subcategories,
    }),
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "whyspent_transaction",
        strict: true,
        schema: buildTransactionSchema(
          options.categories,
          options.subcategories,
          options.currencies
        ),
      },
    },
  });

  let response: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: requestBody,
      signal: AbortSignal.timeout(12_000),
    });
    if (response.ok || (response.status !== 429 && response.status < 500)) {
      break;
    }
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  if (!response?.ok) {
    // Do not include provider response: it can echo user input or operational data.
    throw new Error(`AI_PROVIDER_${response?.status ?? "NO_RESPONSE"}`);
  }
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI_EMPTY_RESPONSE");
  return normalizeParsedTransactionDate({
    parsed: JSON.parse(content) as ParsedTransaction,
    userText: options.text,
    now,
  });
}

async function notifyTelegram(options: {
  botToken: string;
  telegramId: number;
  amount: number;
  currency: string;
  category: string;
  subcategory: string | null;
  note: string;
  occurredAt: string;
  timezone: string;
}): Promise<boolean> {
  const title = "✅ Расход добавлен";
  const date = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: options.timezone,
  }).format(new Date(options.occurredAt));
  const lines = [
    `<b>${title}</b>`,
    "",
    `<b>${options.amount.toLocaleString("ru-RU")} ${escapeTelegramHtml(options.currency)}</b>`,
    escapeTelegramHtml(
      options.subcategory ? `${options.category} / ${options.subcategory}` : options.category
    ),
    escapeTelegramHtml(date),
  ];
  if (options.note) lines.push(escapeTelegramHtml(options.note));

  const fallbackText = lines.join("\n");
  const richResponse = await fetch(
    `https://api.telegram.org/bot${options.botToken}/sendRichMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: options.telegramId,
        rich_message: {
          markdown: htmlToTelegramRichMarkdown(fallbackText),
          skip_entity_detection: true,
        },
      }),
      signal: AbortSignal.timeout(8_000),
    }
  );
  if (richResponse.ok) return true;

  const response = await fetch(
    `https://api.telegram.org/bot${options.botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: options.telegramId,
        text: htmlToTelegramMarkdownV2(fallbackText),
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8_000),
    }
  );
  return response.ok;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_REQUEST_BYTES) return json({ error: "Request is too large" }, 413);

  const supabaseUrl = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const tokenPepper = env("SHORTCUT_TOKEN_PEPPER");
  const aiMode = env("SHORTCUT_AI_MODE") === "mock" ? "mock" : "openai";
  const aiEnabled = env("SHORTCUT_AI_ENABLED") !== "false";
  const openaiApiKey = env("OPENAI_API_KEY");
  const telegramBotToken = env("TELEGRAM_BOT_TOKEN");

  if (!supabaseUrl || !serviceRoleKey || !tokenPepper) {
    return json({ error: "Server misconfiguration" }, 500);
  }
  if (aiMode === "openai" && !openaiApiKey) {
    return json({ error: "AI provider is not configured" }, 503);
  }
  if (!aiEnabled) {
    return json(
      {
        error: "Shortcut is temporarily unavailable",
        error_code: "shortcut_temporarily_disabled",
      },
      503
    );
  }

  let rawBody: unknown;
  try {
    const rawText = await request.text();
    if (new TextEncoder().encode(rawText).byteLength > MAX_REQUEST_BYTES) {
      return json({ error: "Request is too large" }, 413);
    }
    rawBody = JSON.parse(rawText);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const token =
    readShortcutBodyToken(rawBody) ?? readBearerToken(request.headers.get("authorization"));
  if (!token) return json({ error: "Unauthorized" }, 401);

  const body = validateShortcutBody(rawBody);
  if (!body.ok) return json({ error: body.error }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let activeRequestRowId: string | null = null;

  try {
    const tokenHash = await hmacToken(token, tokenPepper);
    const { data: accessToken, error: tokenError } = await supabase
      .from("shortcut_access_tokens")
      .select("id,user_id,expires_at,revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (tokenError || !accessToken || accessToken.revoked_at) {
      return json({ error: "Unauthorized" }, 401);
    }
    if (accessToken.expires_at && Date.parse(accessToken.expires_at) <= Date.now()) {
      return json({ error: "Token expired" }, 401);
    }

    const shortcutAccess = await checkShortcutAccess({
      supabase,
      userId: accessToken.user_id,
    });
    if (!shortcutAccess.ok) {
      return json(
        {
          error: "Shortcut access required",
          error_code: shortcutAccess.errorCode,
          message: shortcutAccess.message,
        },
        shortcutAccess.status
      );
    }

    const [settingsResult, categoriesResult, subcategoriesResult, currenciesResult] =
      await Promise.all([
        supabase
          .from("user_settings")
          .select("default_currency,timezone")
          .eq("user_id", accessToken.user_id)
          .single(),
        supabase
          .from("categories")
          .select("id,name,type,sort_order")
          .or(`user_id.is.null,user_id.eq.${accessToken.user_id}`)
          .eq("type", "expense")
          .eq("is_archived", false)
          .order("sort_order")
          .limit(MAX_CATEGORY_OPTIONS + 1),
        supabase
          .from("subcategories")
          .select("id,name,category_id")
          .or(`user_id.is.null,user_id.eq.${accessToken.user_id}`)
          .order("name")
          .limit(MAX_SUBCATEGORY_OPTIONS + 1),
        supabase.from("currencies").select("code").eq("is_active", true),
      ]);
    if (
      settingsResult.error ||
      categoriesResult.error ||
      subcategoriesResult.error ||
      currenciesResult.error
    ) {
      return json({ error: "Unable to load transaction settings" }, 500);
    }
    if (
      (categoriesResult.data?.length ?? 0) > MAX_CATEGORY_OPTIONS ||
      (subcategoriesResult.data?.length ?? 0) > MAX_SUBCATEGORY_OPTIONS
    ) {
      return json({ error: "Too many categories configured" }, 422);
    }

    const categories: CategoryOption[] = (categoriesResult.data ?? []).map(
      (category: { id: string; name: string; type: "expense" | "income" }, index: number) => ({
        key: `cat_${index}`,
        id: category.id,
        name: category.name,
        type: category.type,
      })
    );
    const allowedCategoryIds = new Set(categories.map((category) => category.id));
    const subcategories: SubcategoryOption[] = (subcategoriesResult.data ?? [])
      .filter((subcategory: { category_id: string }) =>
        allowedCategoryIds.has(subcategory.category_id)
      )
      .map((subcategory: { id: string; name: string; category_id: string }, index: number) => ({
        key: `sub_${index}`,
        id: subcategory.id,
        name: subcategory.name,
        category_id: subcategory.category_id,
      }));
    const currencies = (currenciesResult.data ?? []).map((item: { code: string }) => item.code);
    const defaultCurrency = settingsResult.data.default_currency;
    const userTimezone = settingsResult.data.timezone || body.value.timezone;
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: userTimezone }).format();
    } catch {
      return json({ error: "Invalid timezone configured" }, 422);
    }
    if (!categories.length || !currencies.includes(defaultCurrency)) {
      return json({ error: "Transaction settings are incomplete" }, 422);
    }

    const { data: reservationData, error: reservationError } =
      await supabase.rpc("begin_shortcut_ingestion", {
        p_token_id: accessToken.id,
        p_user_id: accessToken.user_id,
        p_request_id: body.value.request_id,
        // Dry runs still call the AI provider and therefore consume one request.
        // Never trust the client-controlled dry_run flag as a free-quota bypass.
        p_counts_toward_quota: true,
        p_rate_limit_per_minute: RATE_LIMIT_PER_MINUTE,
        p_user_daily_limit: USER_DAILY_LIMIT,
        p_global_rate_limit_per_minute: GLOBAL_RATE_LIMIT_PER_MINUTE,
        p_global_daily_limit: GLOBAL_DAILY_LIMIT,
      });
    if (reservationError) {
      return json({ error: "Unable to start request" }, 500);
    }
    const reservation = Array.isArray(reservationData)
      ? reservationData[0]
      : reservationData;
    if (!reservation) return json({ error: "Unable to start request" }, 500);
    if (reservation.outcome === "duplicate") {
      return json({
        ok: true,
        duplicate: true,
        transaction_id: reservation.existing_transaction_id,
        message: "Эта операция уже была добавлена",
      });
    }
    if (reservation.outcome === "processing") {
      return json({ error: "Request is already being processed" }, 409);
    }
    if (reservation.outcome === "rate_limited") {
      return json(
        {
          error: "Too many requests",
          error_code: "minute_limit_reached",
          message: "Слишком много запросов. Попробуйте через минуту",
        },
        429
      );
    }
    if (reservation.outcome === "daily_limit_reached") {
      return json(
        {
          error: "Daily limit reached",
          error_code: "daily_limit_reached",
          message: "Дневной лимит Shortcut исчерпан. Попробуйте позже",
        },
        429
      );
    }
    if (reservation.outcome === "capacity_limited") {
      return json(
        {
          error: "Shortcut capacity limit reached",
          error_code: "capacity_limited",
          message: "Shortcut временно перегружен. Попробуйте позже",
        },
        503
      );
    }
    if (
      reservation.outcome === "access_required" ||
      reservation.outcome === "trial_limit_reached"
    ) {
      return json(
        {
          error: "Shortcut access required",
          error_code:
            reservation.outcome === "trial_limit_reached"
              ? "trial_limit_reached"
              : "shortcut_access_required",
          message:
            reservation.outcome === "trial_limit_reached"
              ? "Пробный доступ закончился. Откройте раздел Apple Shortcut в боте"
              : "Откройте раздел Apple Shortcut в боте и включите доступ",
        },
        402
      );
    }
    if (reservation.outcome !== "ready" || !reservation.request_row_id) {
      return json({ error: "Unable to start request" }, 500);
    }
    const requestRowId = reservation.request_row_id as string;
    activeRequestRowId = requestRowId;

    let parsed: ParsedTransaction;
    try {
      parsed =
        aiMode === "mock"
          ? createMockParse({
              text: body.value.text,
              now: new Date(),
              defaultCurrency,
              categories,
              subcategories,
            })
          : await parseWithOpenAI({
              apiKey: openaiApiKey as string,
              text: body.value.text,
              timezone: userTimezone,
              locale: body.value.locale,
              defaultCurrency,
              categories,
              subcategories,
              currencies,
            });
    } catch (error) {
      // Keep provider responses private: they can contain user text. The status
      // itself is sufficient to diagnose credentials, quota and rate limits.
      const providerError = error instanceof Error ? error.message : "AI_UNKNOWN_ERROR";
      console.error("shortcut_ai_provider_failed", { providerError });
      await markRequestFailed(supabase, requestRowId, "ai_provider_error");
      return json(
        {
          error: "Unable to parse transaction",
          error_code: providerError,
        },
        503
      );
    }

    const semanticError = validateParsedTransaction(parsed, categories, subcategories, currencies);
    if (semanticError) {
      await markRequestFailed(supabase, requestRowId, semanticError);
      if (semanticError === "income_not_supported") {
        return json(
          {
            ok: false,
            needs_clarification: true,
            error_code: semanticError,
            clarification: "Shortcut добавляет только расходы",
          },
          422
        );
      }
      return json(
        {
          error: "Unable to validate parsed transaction",
          error_code: semanticError,
        },
        422
      );
    }
    if (!parsed.valid || parsed.confidence < MIN_AUTO_SAVE_CONFIDENCE) {
      await markRequestFailed(supabase, requestRowId, "clarification_required");
      return json(
        {
          ok: false,
          needs_clarification: true,
          clarification: parsed.clarification || "Уточните сумму и категорию операции",
        },
        422
      );
    }

    const category = categories.find((item) => item.key === parsed.category_key) as CategoryOption;
    const subcategory = parsed.subcategory_key
      ? subcategories.find((item) => item.key === parsed.subcategory_key)
      : null;
    const safeResult = {
      direction: "expense" as const,
      amount: parsed.amount as number,
      currency: parsed.currency as string,
      category: category.name,
      subcategory: subcategory?.name ?? null,
      occurred_at: parsed.occurred_at as string,
      note: parsed.note,
      confidence: parsed.confidence,
    };
    if (body.value.dry_run) {
      await supabase
        .from("shortcut_ingestion_requests")
        .update({ status: "completed", error_code: null })
        .eq("id", requestRowId);
      return json({
        ok: true,
        dry_run: true,
        transaction: safeResult,
        message: "Проверка прошла успешно, операция не сохранена",
      });
    }

    const { data: transactionId, error: insertError } = await supabase.rpc(
      "create_shortcut_transaction",
      {
        p_request_row_id: requestRowId,
        p_user_id: accessToken.user_id,
        p_direction: parsed.direction,
        p_amount: parsed.amount,
        p_currency_code: parsed.currency,
        p_category_id: category.id,
        p_subcategory_id: subcategory?.id ?? null,
        p_occurred_at: parsed.occurred_at,
        p_note: parsed.note,
      }
    );
    if (insertError || !transactionId) {
      await markRequestFailed(supabase, requestRowId, "transaction_insert_failed");
      return json({ error: "Unable to save transaction" }, 500);
    }
    await supabase
      .from("shortcut_access_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", accessToken.id);

    const { data: referralData } = await supabase.rpc(
      "complete_shortcut_referral",
      { p_invitee_user_id: accessToken.user_id }
    );
    const referralResult = Array.isArray(referralData)
      ? referralData[0]
      : referralData;

    let notificationSent = false;
    if (telegramBotToken) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("telegram_id")
        .eq("id", accessToken.user_id)
        .single();
      if (profile?.telegram_id) {
        try {
          notificationSent = await notifyTelegram({
            botToken: telegramBotToken,
            telegramId: profile.telegram_id,
            amount: safeResult.amount,
            currency: safeResult.currency,
            category: safeResult.category,
            subcategory: safeResult.subcategory,
            note: safeResult.note,
            occurredAt: safeResult.occurred_at,
            timezone: userTimezone,
          });
        } catch {
          notificationSent = false;
        }
      }
      if (referralResult?.rewarded) {
        try {
          if (referralResult.inviter_rewarded && referralResult.inviter_telegram_id) {
            await fetch(
              `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: referralResult.inviter_telegram_id,
                  text: htmlToTelegramMarkdownV2(
                    "Друг добавил первый расход. Вам добавлено 7 дней WhySpent Plus."
                  ),
                  parse_mode: "MarkdownV2",
                }),
                signal: AbortSignal.timeout(8_000),
              }
            );
          }
          if (referralResult.invitee_telegram_id) {
            await fetch(
              `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: referralResult.invitee_telegram_id,
                  text: htmlToTelegramMarkdownV2(
                    "Первый расход добавлен. Вам открыт WhySpent Plus на 7 дней."
                  ),
                  parse_mode: "MarkdownV2",
                }),
                signal: AbortSignal.timeout(8_000),
              }
            );
          }
        } catch {
          // Referral rewards are committed even if Telegram is temporarily unavailable.
        }
      }
    }

    return json({
      ok: true,
      transaction_id: transactionId,
      transaction: safeResult,
      notification_sent: notificationSent,
      message: notificationSent
        ? "Операция добавлена в WhySpent, уведомление отправлено"
        : "Операция добавлена в WhySpent",
    });
  } catch {
    // Never return exception details or log the request body/token.
    if (activeRequestRowId) {
      await markRequestFailed(
        supabase,
        activeRequestRowId,
        "unexpected_server_error"
      );
    }
    return json({ error: "Internal server error" }, 500);
  }
});
