// Telegram webhook for payments and Apple Shortcut access.
// Required secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET.
// Payments additionally require PAYMENT_SUPPORT_CONTACT.
// Shortcut commands additionally require SHORTCUT_TOKEN_PEPPER.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";
import {
  escapeTelegramHtml,
  generateShortcutToken,
  hmacToken,
} from "../_shared/shortcut.ts";

function createAdminClient(url: string, serviceRoleKey: string) {
  return createClient<any>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type AdminClient = ReturnType<typeof createAdminClient>;

const SHORTCUT_TEMPLATE_URL =
  "https://www.icloud.com/shortcuts/97d983fd4aee49c0806e46ad924697e5";
const WHYSPENT_BOT_USERNAME = "WhySpentBot";
const SHORTCUT_MONTH_STARS = 250;
const SHORTCUT_MONTH_DAYS = 30;
const SUBSCRIPTION_RENEWAL_WINDOW_DAYS = 7;
const REFERRAL_REWARD_DAYS = 7;
const MAX_REWARDED_REFERRALS = 20;
const TRIAL_HOURS = 24;
const TRIAL_REQUEST_LIMIT = 10;
const SHORTCUT_PAYMENT_PAYLOAD_PREFIX = "whyspent_shortcut_month_v2";
const LEGACY_SHORTCUT_PAYMENT_PAYLOAD_PREFIX = "whyspent_shortcut_month";
const PAYMENT_ORDER_MINUTES = 15;

interface TelegramUser {
  id: number;
}

interface TelegramChat {
  id: number;
}

interface TelegramMessage {
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
  caption?: string;
  video?: {
    file_id: string;
    file_size?: number;
    mime_type?: string;
  };
  animation?: {
    file_id: string;
    file_size?: number;
    mime_type?: string;
    file_name?: string;
  };
  successful_payment?: {
    currency: string;
    total_amount: number;
    invoice_payload: string;
    telegram_payment_charge_id: string;
  };
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  pre_checkout_query?: {
    id: string;
    from: TelegramUser;
    currency: string;
    total_amount: number;
    invoice_payload: string;
  };
}

interface Profile {
  id: string;
  telegram_id: number;
}

interface ShortcutEntitlement {
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_request_limit: number;
  paid_until: string | null;
  referral_access_until: string | null;
  bonus_request_credits: number;
}

interface ShortcutState {
  entitlement: ShortcutEntitlement | null;
  trialUsed: boolean;
  trialActive: boolean;
  trialRemaining: number;
  paidActive: boolean;
  paidUntil: string | null;
  referralActive: boolean;
  referralUntil: string | null;
  accessUntil: string | null;
  bonusCredits: number;
  accessActive: boolean;
}

function env(name: string): string | null {
  return Deno.env.get(name) ?? null;
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function response(body = "ok", status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function privateChatOnly(chatId: number, telegramId: number): boolean {
  return chatId === telegramId;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function latestDate(...values: Array<string | null | undefined>): string | null {
  const valid = values
    .filter(
      (value): value is string =>
        typeof value === "string" && !Number.isNaN(Date.parse(value))
    )
    .sort((left, right) => Date.parse(right) - Date.parse(left));
  return valid[0] ?? null;
}

function canRenewSubscription(state: ShortcutState | null): boolean {
  if (!state?.paidActive || !state.paidUntil) return true;
  const renewalWindowMs = SUBSCRIPTION_RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const activeUntil = latestDate(state.paidUntil, state.referralUntil) ?? state.paidUntil;
  return Date.parse(activeUntil) - Date.now() <= renewalWindowMs;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}

function shortcutPaymentPayload(telegramId: number): string {
  return `${SHORTCUT_PAYMENT_PAYLOAD_PREFIX}:${telegramId}:${crypto.randomUUID()}`;
}

function parseShortcutPaymentPayload(
  payload: string
): { telegramId: number; requiresOrder: boolean } | null {
  const [prefix, rawTelegramId, nonce, ...extra] = payload.split(":");
  if (
    extra.length > 0 ||
    !nonce ||
    (prefix !== SHORTCUT_PAYMENT_PAYLOAD_PREFIX &&
      prefix !== LEGACY_SHORTCUT_PAYMENT_PAYLOAD_PREFIX)
  ) {
    return null;
  }
  const telegramId = Number(rawTelegramId);
  if (!Number.isSafeInteger(telegramId) || telegramId <= 0) return null;
  return {
    telegramId,
    requiresOrder: prefix === SHORTCUT_PAYMENT_PAYLOAD_PREFIX,
  };
}

async function callTelegram(
  botToken: string,
  method: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const result = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000),
  });
  return result.ok;
}

async function sendMessage(
  botToken: string,
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>
): Promise<boolean> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return callTelegram(botToken, "sendMessage", payload);
}

async function sendVideo(
  botToken: string,
  chatId: number,
  fileId: string,
  caption: string,
  replyMarkup: Record<string, unknown>
): Promise<boolean> {
  return callTelegram(botToken, "sendVideo", {
    chat_id: chatId,
    video: fileId,
    supports_streaming: true,
    caption,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

async function sendAnimation(
  botToken: string,
  chatId: number,
  fileId: string,
  caption: string,
  replyMarkup: Record<string, unknown>
): Promise<boolean> {
  return callTelegram(botToken, "sendAnimation", {
    chat_id: chatId,
    animation: fileId,
    caption,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

async function answerCallback(
  botToken: string,
  callbackId: string,
  text?: string
): Promise<void> {
  await callTelegram(botToken, "answerCallbackQuery", {
    callback_query_id: callbackId,
    ...(text ? { text } : {}),
  });
}

async function answerPreCheckout(
  botToken: string,
  preCheckoutQueryId: string,
  ok: boolean,
  errorMessage?: string
): Promise<boolean> {
  return callTelegram(botToken, "answerPreCheckoutQuery", {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
    ...(ok ? {} : { error_message: errorMessage ?? "Платёж не прошёл" }),
  });
}

async function sendShortcutInvoice(options: {
  botToken: string;
  admin: AdminClient;
  chatId: number;
  userId: string;
}): Promise<boolean> {
  if (!env("PAYMENT_SUPPORT_CONTACT")) return false;
  const payload = shortcutPaymentPayload(options.chatId);
  const expiresAt = new Date(
    Date.now() + PAYMENT_ORDER_MINUTES * 60_000
  ).toISOString();
  const { error: cancelError } = await options.admin
    .from("shortcut_payment_orders")
    .update({ status: "cancelled" })
    .eq("user_id", options.userId)
    .eq("product", "shortcut_30_days")
    .eq("status", "pending");
  if (cancelError) return false;

  const { error: orderError } = await options.admin
    .from("shortcut_payment_orders")
    .insert({
      user_id: options.userId,
      payload,
      product: "shortcut_30_days",
      amount: SHORTCUT_MONTH_STARS,
      currency: "XTR",
      status: "pending",
      expires_at: expiresAt,
    });
  if (orderError) return false;

  const sent = await callTelegram(options.botToken, "sendInvoice", {
    chat_id: options.chatId,
    title: "WhySpent Shortcut на месяц",
    description: "Быстрое добавление расходов с iPhone через Apple Shortcut.",
    payload,
    provider_token: "",
    currency: "XTR",
    prices: [{ label: "Apple Shortcut, 30 дней", amount: SHORTCUT_MONTH_STARS }],
  });
  if (!sent) {
    await options.admin
      .from("shortcut_payment_orders")
      .update({ status: "cancelled" })
      .eq("payload", payload)
      .eq("status", "pending");
  }
  return sent;
}

function mainKeyboard(): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: "Подключить Apple Shortcut", callback_data: "shortcut" }],
      [{ text: "Доступ и подписка", callback_data: "subscription" }],
      [{ text: "Пригласить друга", callback_data: "referral" }],
      [{ text: "Помощь и настройки", callback_data: "help" }],
      [{ text: "Открыть WhySpent", url: `https://t.me/${WHYSPENT_BOT_USERNAME}` }],
    ],
  };
}

function shortcutKeyboard(state: ShortcutState): Record<string, unknown> {
  const rows: Array<Array<Record<string, string>>> = [
    [{ text: "Установить Shortcut", url: SHORTCUT_TEMPLATE_URL }],
  ];

  if (state.accessActive) {
    rows.push([{ text: "Получить токен", callback_data: "shortcut_token" }]);
  } else if (!state.trialUsed) {
    rows.push([{ text: "Попробовать бесплатно", callback_data: "shortcut_trial" }]);
  }

  rows.push([{ text: "Доступ и подписка", callback_data: "subscription" }]);
  rows.push([{ text: "Управление токеном", callback_data: "shortcut_manage" }]);
  rows.push([{ text: "← Главное меню", callback_data: "home" }]);
  return { inline_keyboard: rows };
}

function subscriptionKeyboard(state: ShortcutState | null): Record<string, unknown> {
  const rows: Array<Array<Record<string, string>>> = [];
  if (state && !state.trialUsed && !state.accessActive) {
    rows.push([{ text: "Попробовать бесплатно", callback_data: "shortcut_trial" }]);
  }
  if (canRenewSubscription(state)) {
    rows.push([
      {
        text: state?.paidActive
          ? `Продлить на 30 дней · ${SHORTCUT_MONTH_STARS} ⭐️`
          : `Оформить на 30 дней · ${SHORTCUT_MONTH_STARS} ⭐️`,
        callback_data: "pay_stars",
      },
    ]);
  }
  rows.push([
    { text: "Условия", callback_data: "terms" },
    { text: "Поддержка", callback_data: "paysupport" },
  ]);
  rows.push([{ text: "← Главное меню", callback_data: "home" }]);
  return { inline_keyboard: rows };
}

function tokenKeyboard(): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: "Установить Shortcut", url: SHORTCUT_TEMPLATE_URL }],
      [{ text: "Назад к Shortcut", callback_data: "shortcut" }],
      [{ text: "← Главное меню", callback_data: "home" }],
    ],
  };
}

function shortcutManagementKeyboard(): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: "Получить новый токен", callback_data: "shortcut_token" }],
      [{ text: "Отозвать все токены", callback_data: "shortcut_revoke_confirm" }],
      [{ text: "← Назад к Shortcut", callback_data: "shortcut" }],
      [{ text: "← Главное меню", callback_data: "home" }],
    ],
  };
}

function shortcutRevokeConfirmKeyboard(): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: "Да, отозвать токены", callback_data: "shortcut_revoke" }],
      [{ text: "← Не отзывать", callback_data: "shortcut_manage" }],
      [{ text: "← Главное меню", callback_data: "home" }],
    ],
  };
}

function helpKeyboard(remindersEnabled: boolean): Record<string, unknown> {
  return {
    inline_keyboard: [
      [
        {
          text: remindersEnabled ? "Отключить напоминания" : "Включить напоминания",
          callback_data: remindersEnabled ? "reminders_off" : "reminders_on",
        },
      ],
      [{ text: "Поддержка по оплате", callback_data: "paysupport" }],
      [{ text: "← Главное меню", callback_data: "home" }],
    ],
  };
}

function termsKeyboard(): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: "← Назад к подписке", callback_data: "subscription" }],
      [{ text: "← Главное меню", callback_data: "home" }],
    ],
  };
}

function paymentSupportKeyboard(): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: "← Назад к подписке", callback_data: "subscription" }],
      [{ text: "← Главное меню", callback_data: "home" }],
    ],
  };
}

function buildHomeMessage(): string {
  return [
    "<b>WhySpent</b>",
    "",
    "Учёт расходов, который не отвлекает.",
    "Добавляйте покупки с iPhone и следите за бюджетом в приложении.",
    "",
    "Выберите нужный раздел ниже.",
  ].join("\n");
}

function buildHelpMessage(): string {
  return [
    "<b>Помощь и настройки</b>",
    "",
    "Здесь можно настроить редкие напоминания или обратиться по вопросу оплаты.",
    "Если Shortcut не работает, откройте «Подключить Apple Shortcut» и получите новый токен.",
  ].join("\n");
}

function buildTermsMessage(): string {
  return [
    "<b>Условия оплаты</b>",
    "",
    `250 ⭐️ дают доступ к Apple Shortcut на ${SHORTCUT_MONTH_DAYS} дней.`,
    "Это разовая покупка без автоматического продления.",
    "Срок прибавляется к уже оплаченному периоду.",
    "",
    "Оплачивая счёт, вы соглашаетесь с этими условиями.",
    "По вопросам оплаты используйте кнопку «Поддержка».",
  ].join("\n");
}

function buildPaySupportMessage(): string {
  const contact = env("PAYMENT_SUPPORT_CONTACT");
  return [
    "<b>Поддержка по платежам</b>",
    "",
    contact
      ? `Если оплата прошла, а доступ не появился, напишите: ${escapeTelegramHtml(contact)}.`
      : "Контакт поддержки пока не настроен. Покупки временно недоступны.",
    "Укажите дату платежа. Не отправляйте токен Shortcut.",
  ].join("\n");
}

function buildShortcutMessage(state: ShortcutState): string {
  if (state.accessActive) {
    const details = (state.paidActive || state.referralActive) && state.accessUntil
      ? `Доступ активен до ${formatDateTime(state.accessUntil)}.`
      : state.trialActive
        ? `Пробный доступ: осталось ${state.trialRemaining} добавлений.`
        : `Ранее начисленный бонус: ${state.bonusCredits} добавлений.`;
    return [
      "<b>Apple Shortcut</b>",
      "",
      "Добавляйте расходы с iPhone одной строкой.",
      details,
      "",
      "1. Установите Shortcut",
      "2. Вставьте токен в первое поле",
      "3. Напишите: <code>кофе 350</code>",
    ].join("\n");
  }

  if (!state.trialUsed) {
    return [
      "<b>Apple Shortcut</b>",
      "",
      "Добавляйте расходы с iPhone одной строкой.",
      "Попробуйте бесплатно: 24 часа и 10 добавлений.",
    ].join("\n");
  }

  return [
    "<b>Apple Shortcut</b>",
    "",
    "Бесплатный период закончился.",
    `Доступ на 30 дней — ${SHORTCUT_MONTH_STARS} ⭐️.`,
  ].join("\n");
}

function buildSubscriptionMessage(state: ShortcutState | null): string {
  if (state?.paidActive && state.paidUntil) {
    const lines = [
      "<b>Подписка активна</b>",
      "",
      `Оплачено до ${formatDateTime(state.paidUntil)}.`,
    ];
    if (
      state.referralActive &&
      state.referralUntil &&
      Date.parse(state.referralUntil) > Date.parse(state.paidUntil)
    ) {
      lines.push(`С учётом приглашений доступ продлён до ${formatDateTime(state.referralUntil)}.`);
    }
    lines.push(
      "",
      canRenewSubscription(state)
        ? `Можно продлить ещё на 30 дней за ${SHORTCUT_MONTH_STARS} ⭐️.`
        : `Продление появится за ${SUBSCRIPTION_RENEWAL_WINDOW_DAYS} дней до конца доступа.`
    );
    if (canRenewSubscription(state)) {
      lines.push("Оплата означает согласие с условиями /terms.");
    }
    return lines.join("\n");
  }

  if (state?.referralActive && state.referralUntil) {
    return [
      "<b>Бесплатный доступ активен</b>",
      "",
      `Shortcut работает до ${formatDateTime(state.referralUntil)}.`,
      `После этого 30 дней доступа стоят ${SHORTCUT_MONTH_STARS} ⭐️.`,
      "Оплата означает согласие с условиями /terms.",
    ].join("\n");
  }

  if (state?.trialActive && state.entitlement?.trial_ends_at) {
    return [
      "<b>Пробный доступ активен</b>",
      "",
      `Осталось добавлений: ${state.trialRemaining}.`,
      `После пробного периода 30 дней доступа стоят ${SHORTCUT_MONTH_STARS} ⭐️.`,
      "Оплата означает согласие с условиями /terms.",
    ].join("\n");
  }

  return [
    "<b>Подписка</b>",
    "",
    `30 дней доступа к Shortcut — ${SHORTCUT_MONTH_STARS} ⭐️.`,
    ...(state && !state.trialUsed ? ["Первый запуск: 24 часа и 10 добавлений бесплатно."] : []),
    "",
    "Оплачивая счёт, вы принимаете условия /terms.",
  ].join("\n");
}

function buildTokenMessage(token: string): string {
  return [
    "<b>Токен для Shortcut</b>",
    "",
    `<code>${escapeTelegramHtml(token)}</code>`,
    "",
    "Вставьте его в первое верхнее поле Shortcut.",
    "Остальное уже настроено.",
  ].join("\n");
}

function buildShortcutManagementMessage(): string {
  return [
    "<b>Управление токеном</b>",
    "",
    "Новый токен сразу отключит предыдущий.",
    "Отзыв отключит все токены на ваших устройствах.",
  ].join("\n");
}

function buildRevokeTokenMessage(): string {
  return [
    "<b>Отозвать все токены?</b>",
    "",
    "Shortcut перестанет добавлять расходы на всех устройствах.",
    "Позже можно получить новый токен.",
  ].join("\n");
}

function buildReferralMessage(options: {
  rewarded: number;
  pending: number;
}): string {
  return [
    "<b>7 дней каждому</b>",
    "",
    "Отправьте другу вашу ссылку.",
    `После его первого расхода через Shortcut вы оба получите по ${REFERRAL_REWARD_DAYS} дней доступа.`,
    `Вам начисляются дни за первых ${MAX_REWARDED_REFERRALS} друзей.`,
    "",
    `Получили доступ: ${options.rewarded}`,
    `Ещё не добавили расход: ${options.pending}`,
  ].join("\n");
}

function referralKeyboard(code: string, canInvite: boolean): Record<string, unknown> {
  const referralUrl = `https://t.me/${WHYSPENT_BOT_USERNAME}?start=ref_${code}`;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(
    `Попробуй WhySpent — расходы добавляются с iPhone одной строкой. После первого расхода мы оба получим по ${REFERRAL_REWARD_DAYS} дней доступа.`
  )}`;
  return {
    inline_keyboard: [
      ...(canInvite ? [[{ text: "Поделиться ссылкой", url: shareUrl }]] : []),
      [{ text: "Apple Shortcut", callback_data: "shortcut" }],
      [{ text: "← Главное меню", callback_data: "home" }],
    ],
  };
}

function profileMissingMessage(): string {
  return [
    "Сначала откройте WhySpent.",
    "Так бот поймёт, к какому аккаунту подключить Shortcut.",
  ].join("\n");
}

function accessAfterPaymentMessage(paidUntil: string): string {
  return [
    "<b>Подписка активна</b>",
    "",
    `Shortcut доступен до ${formatDateTime(paidUntil)}.`,
    "Теперь можно получить токен и добавить первый расход.",
  ].join("\n");
}

function openAppKeyboard(): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: "Открыть WhySpent", url: `https://t.me/${WHYSPENT_BOT_USERNAME}` }],
      [{ text: "← Главное меню", callback_data: "home" }],
    ],
  };
}

async function getProfile(
  admin: AdminClient,
  telegramId: number
): Promise<Profile | null> {
  const { data } = await admin
    .from("profiles")
    .select("id,telegram_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

async function remindersEnabledForUser(
  admin: AdminClient,
  userId: string
): Promise<boolean> {
  const { data } = await admin
    .from("shortcut_reminder_state")
    .select("enabled")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.enabled !== false;
}

async function loadShortcutState(
  admin: AdminClient,
  userId: string
): Promise<ShortcutState> {
  const { data } = await admin
    .from("shortcut_entitlements")
    .select(
      "trial_started_at,trial_ends_at,trial_request_limit,paid_until,referral_access_until,bonus_request_credits"
    )
    .eq("user_id", userId)
    .maybeSingle();
  const entitlement = (data as ShortcutEntitlement | null) ?? null;
  const now = Date.now();
  const paidActive = Boolean(entitlement?.paid_until && Date.parse(entitlement.paid_until) > now);
  const referralActive = Boolean(
    entitlement?.referral_access_until && Date.parse(entitlement.referral_access_until) > now
  );
  const trialUsed = Boolean(entitlement?.trial_started_at);
  const bonusCredits = entitlement?.bonus_request_credits ?? 0;
  let trialRemaining = entitlement?.trial_request_limit ?? TRIAL_REQUEST_LIMIT;

  if (entitlement?.trial_started_at && entitlement.trial_ends_at) {
    const { count } = await admin
      .from("shortcut_ingestion_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("counts_toward_quota", true)
      .in("status", ["processing", "completed", "failed"])
      .gte("created_at", entitlement.trial_started_at)
      .lte("created_at", entitlement.trial_ends_at);
    trialRemaining = Math.max(0, entitlement.trial_request_limit - (count ?? 0));
  }

  const trialActive = Boolean(
    entitlement?.trial_ends_at &&
      Date.parse(entitlement.trial_ends_at) > now &&
      trialRemaining > 0
  );

  return {
    entitlement,
    trialUsed,
    trialActive,
    trialRemaining,
    paidActive,
    paidUntil: entitlement?.paid_until ?? null,
    referralActive,
    referralUntil: entitlement?.referral_access_until ?? null,
    accessUntil: latestDate(
      paidActive ? entitlement?.paid_until : null,
      referralActive ? entitlement?.referral_access_until : null,
      trialActive ? entitlement?.trial_ends_at : null
    ),
    bonusCredits,
    accessActive: paidActive || referralActive || trialActive || bonusCredits > 0,
  };
}

async function startTrial(
  admin: AdminClient,
  userId: string
): Promise<ShortcutState> {
  const state = await loadShortcutState(admin, userId);
  if (state.trialUsed) return state;

  const now = new Date();
  await admin.from("shortcut_entitlements").upsert({
    user_id: userId,
    trial_started_at: now.toISOString(),
    trial_ends_at: addHours(now, TRIAL_HOURS).toISOString(),
    trial_request_limit: TRIAL_REQUEST_LIMIT,
  });
  return loadShortcutState(admin, userId);
}

async function rotateShortcutToken(options: {
  admin: AdminClient;
  pepper: string;
  userId: string;
}): Promise<{ ok: true; token: string } | { ok: false }> {
  const plaintextToken = generateShortcutToken();
  const tokenHash = await hmacToken(plaintextToken, options.pepper);
  const { data: createdId, error: rotateError } = await options.admin.rpc(
    "rotate_shortcut_access_token",
    {
      p_user_id: options.userId,
      p_token_hash: tokenHash,
      p_label: "Apple Shortcut",
    }
  );
  if (rotateError || !createdId) return { ok: false };
  return { ok: true, token: plaintextToken };
}

async function revokeShortcutTokens(options: {
  admin: AdminClient;
  telegramId: number;
}): Promise<boolean> {
  const profile = await getProfile(options.admin, options.telegramId);
  if (!profile) return false;
  const { error } = await options.admin.rpc("revoke_shortcut_access_tokens", {
    p_user_id: profile.id,
  });
  return !error;
}

async function recordStarsPayment(options: {
  admin: AdminClient;
  userId: string;
  payment: TelegramMessage["successful_payment"];
}): Promise<{ paidUntil: string; duplicate: boolean } | null> {
  if (!options.payment) return null;
  if (options.payment.currency !== "XTR") return null;
  if (options.payment.total_amount !== SHORTCUT_MONTH_STARS) return null;

  const { data, error } = await options.admin.rpc(
    "fulfill_shortcut_stars_payment",
    {
      p_user_id: options.userId,
      p_provider_charge_id:
        options.payment.telegram_payment_charge_id,
      p_payload: options.payment.invoice_payload,
      p_amount: options.payment.total_amount,
      p_currency: options.payment.currency,
      p_access_days: SHORTCUT_MONTH_DAYS,
    }
  );
  if (error) return null;
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.paid_until) return null;
  return {
    paidUntil: result.paid_until as string,
    duplicate: Boolean(result.duplicate),
  };
}

async function sendShortcutSection(
  botToken: string,
  admin: AdminClient,
  chatId: number,
  telegramId: number
): Promise<void> {
  const profile = await getProfile(admin, telegramId);
  if (!profile) {
    await sendMessage(botToken, chatId, profileMissingMessage(), openAppKeyboard());
    return;
  }
  const { data: demoSettings } = await admin
    .from("bot_settings")
    .select("key,value")
    .in("key", [
      "shortcut_demo_animation_file_id",
      "shortcut_demo_video_file_id",
    ]);
  const animationFileId = demoSettings?.find(
    (setting) => setting.key === "shortcut_demo_animation_file_id"
  )?.value;
  const legacyVideoFileId = demoSettings?.find(
    (setting) => setting.key === "shortcut_demo_video_file_id"
  )?.value;
  const state = await loadShortcutState(admin, profile.id);
  const message = buildShortcutMessage(state);
  const keyboard = shortcutKeyboard(state);
  let mediaSent = false;
  if (animationFileId) {
    mediaSent = await sendAnimation(
      botToken,
      chatId,
      animationFileId,
      message,
      keyboard
    );
  } else if (legacyVideoFileId) {
    mediaSent = await sendVideo(
      botToken,
      chatId,
      legacyVideoFileId,
      message,
      keyboard
    );
  }
  if (!mediaSent) {
    await sendMessage(botToken, chatId, message, keyboard);
  }
}

async function sendReferralSection(
  botToken: string,
  admin: AdminClient,
  chatId: number,
  telegramId: number
): Promise<void> {
  const profile = await getProfile(admin, telegramId);
  if (!profile) {
    await sendMessage(botToken, chatId, profileMissingMessage(), openAppKeyboard());
    return;
  }
  const [{ data: code, error: codeError }, { data: referrals }] = await Promise.all([
    admin.rpc("get_or_create_shortcut_referral_code", { p_user_id: profile.id }),
    admin
      .from("shortcut_referrals")
      .select("status")
      .eq("inviter_user_id", profile.id),
  ]);
  if (codeError || typeof code !== "string") {
    await sendMessage(
      botToken,
      chatId,
      "Не удалось создать ссылку. Попробуйте позже.",
      mainKeyboard()
    );
    return;
  }
  const rows = (referrals ?? []) as Array<{ status: string }>;
  const rewarded = rows.filter((item) => item.status === "rewarded").length;
  await sendMessage(
    botToken,
    chatId,
    buildReferralMessage({
      rewarded,
      pending: rows.filter((item) => item.status === "pending").length,
    }),
    referralKeyboard(code, rewarded < MAX_REWARDED_REFERRALS)
  );
}

async function sendSubscriptionSection(
  botToken: string,
  admin: AdminClient,
  chatId: number,
  telegramId: number
): Promise<void> {
  const profile = await getProfile(admin, telegramId);
  if (!profile) {
    await sendMessage(botToken, chatId, profileMissingMessage(), openAppKeyboard());
    return;
  }
  const state = await loadShortcutState(admin, profile.id);
  await sendMessage(botToken, chatId, buildSubscriptionMessage(state), subscriptionKeyboard(state));
}

async function sendHelpSection(
  botToken: string,
  admin: AdminClient,
  chatId: number,
  telegramId: number
): Promise<void> {
  const profile = await getProfile(admin, telegramId);
  if (!profile) {
    await sendMessage(botToken, chatId, buildHelpMessage(), mainKeyboard());
    return;
  }
  const remindersEnabled = await remindersEnabledForUser(admin, profile.id);
  await sendMessage(botToken, chatId, buildHelpMessage(), helpKeyboard(remindersEnabled));
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") return response("Method not allowed", 405);

  const botToken = env("TELEGRAM_BOT_TOKEN");
  const webhookSecret = env("TELEGRAM_WEBHOOK_SECRET");
  if (!botToken || !webhookSecret) return response("Server misconfiguration", 500);

  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!constantTimeEqual(providedSecret, webhookSecret)) return response("Unauthorized", 401);

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 128_000) return response("Request too large", 413);

  let update: TelegramUpdate;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 128_000) {
      return response("Request too large", 413);
    }
    update = JSON.parse(raw) as TelegramUpdate;
  } catch {
    return response("Bad request", 400);
  }

  try {
    const supabaseUrl = env("SUPABASE_URL");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return response("Server misconfiguration", 500);
    const admin = createAdminClient(supabaseUrl, serviceRoleKey);

    if (update.pre_checkout_query) {
      const parsed = parseShortcutPaymentPayload(update.pre_checkout_query.invoice_payload);
      let valid =
        parsed?.telegramId === update.pre_checkout_query.from.id &&
        update.pre_checkout_query.currency === "XTR" &&
        update.pre_checkout_query.total_amount === SHORTCUT_MONTH_STARS;
      if (valid && parsed?.requiresOrder) {
        const profile = await getProfile(
          admin,
          update.pre_checkout_query.from.id
        );
        if (!profile) {
          valid = false;
        } else {
          const { data: order, error: orderError } = await admin
            .from("shortcut_payment_orders")
            .select("user_id,amount,currency,status,expires_at")
            .eq("payload", update.pre_checkout_query.invoice_payload)
            .maybeSingle();
          valid = Boolean(
            !orderError &&
              order &&
              order.user_id === profile.id &&
              order.amount === SHORTCUT_MONTH_STARS &&
              order.currency === "XTR" &&
              order.status === "pending" &&
              Date.parse(order.expires_at) > Date.now()
          );
        }
      }
      const accepted = await answerPreCheckout(
        botToken,
        update.pre_checkout_query.id,
        valid,
        "Платёж не найден"
      );
      return response(accepted ? "ok" : "Telegram API error", accepted ? 200 : 502);
    }

    const callback = update.callback_query;
    if (callback?.data && callback.message) {
      await answerCallback(botToken, callback.id);
      const chatId = callback.message.chat.id;
      const telegramId = callback.from.id;

      if (
        !privateChatOnly(chatId, telegramId) &&
        (callback.data === "shortcut" ||
          callback.data === "referral" ||
          callback.data === "subscription" ||
          callback.data === "help")
      ) {
        await sendMessage(botToken, chatId, "Напишите боту в личном чате.");
        return response();
      }

      if (callback.data === "home") {
        await sendMessage(botToken, chatId, buildHomeMessage(), mainKeyboard());
        return response();
      }
      if (callback.data === "help") {
        await sendHelpSection(botToken, admin, chatId, telegramId);
        return response();
      }
      if (callback.data === "terms") {
        await sendMessage(botToken, chatId, buildTermsMessage(), termsKeyboard());
        return response();
      }
      if (callback.data === "paysupport") {
        await sendMessage(
          botToken,
          chatId,
          buildPaySupportMessage(),
          paymentSupportKeyboard()
        );
        return response();
      }
      if (callback.data === "shortcut") {
        await sendShortcutSection(botToken, admin, chatId, telegramId);
        return response();
      }
      if (callback.data === "referral") {
        await sendReferralSection(botToken, admin, chatId, telegramId);
        return response();
      }
      if (callback.data === "subscription") {
        await sendSubscriptionSection(botToken, admin, chatId, telegramId);
        return response();
      }

      if (!privateChatOnly(chatId, telegramId)) {
        await sendMessage(botToken, chatId, "Напишите боту в личном чате.");
        return response();
      }

      const profile = await getProfile(admin, telegramId);
      if (!profile) {
        await sendMessage(botToken, chatId, profileMissingMessage(), openAppKeyboard());
        return response();
      }

      if (callback.data === "reminders_off" || callback.data === "reminders_on") {
        const enabled = callback.data === "reminders_on";
        await admin.from("shortcut_reminder_state").upsert({
          user_id: profile.id,
          enabled,
          ...(enabled
            ? { last_activity_at: new Date().toISOString(), reminder_stage: 0, last_sent_at: null }
            : {}),
        });
        await sendMessage(
          botToken,
          chatId,
          enabled
            ? "Напоминания включены. Писать будем редко и только по делу."
            : "Напоминания отключены.",
          helpKeyboard(enabled)
        );
        return response();
      }

      if (callback.data === "shortcut_manage") {
        await sendMessage(
          botToken,
          chatId,
          buildShortcutManagementMessage(),
          shortcutManagementKeyboard()
        );
        return response();
      }

      if (callback.data === "shortcut_revoke_confirm") {
        await sendMessage(
          botToken,
          chatId,
          buildRevokeTokenMessage(),
          shortcutRevokeConfirmKeyboard()
        );
        return response();
      }

      if (callback.data === "shortcut_trial") {
        const state = await startTrial(admin, profile.id);
        await sendMessage(
          botToken,
          chatId,
          buildShortcutMessage(state),
          shortcutKeyboard(state)
        );
        return response();
      }

      if (callback.data === "shortcut_token") {
        const state = await loadShortcutState(admin, profile.id);
        if (!state.accessActive) {
          await sendMessage(
            botToken,
            chatId,
            buildSubscriptionMessage(state),
            subscriptionKeyboard(state)
          );
          return response();
        }
        const pepper = env("SHORTCUT_TOKEN_PEPPER");
        if (!pepper) return response("Server misconfiguration", 500);
        const issued = await rotateShortcutToken({ admin, pepper, userId: profile.id });
        await sendMessage(
          botToken,
          chatId,
          issued.ok ? buildTokenMessage(issued.token) : "Не удалось создать токен. Попробуйте позже.",
          issued.ok ? tokenKeyboard() : shortcutKeyboard(state)
        );
        return response();
      }

      if (callback.data === "shortcut_revoke") {
        const revoked = await revokeShortcutTokens({ admin, telegramId });
        const state = await loadShortcutState(admin, profile.id);
        await sendMessage(
          botToken,
          chatId,
          revoked ? "Токены отозваны." : "Не удалось отозвать токены.",
          shortcutKeyboard(state)
        );
        return response();
      }

      if (callback.data === "pay_stars") {
        const state = await loadShortcutState(admin, profile.id);
        if (!canRenewSubscription(state)) {
          await sendMessage(
            botToken,
            chatId,
            buildSubscriptionMessage(state),
            subscriptionKeyboard(state)
          );
          return response();
        }
        const sent = await sendShortcutInvoice({
          botToken,
          admin,
          chatId,
          userId: profile.id,
        });
        if (!sent) {
          const state = await loadShortcutState(admin, profile.id);
          await sendMessage(
            botToken,
            chatId,
            "Не удалось создать счёт. Попробуйте ещё раз через минуту.",
            subscriptionKeyboard(state)
          );
        }
        return response();
      }

      return response();
    }

    const message = update.message;
    if (!message) return response();

    if (message.successful_payment) {
      const parsed = parseShortcutPaymentPayload(message.successful_payment.invoice_payload);
      const telegramId = message.from?.id;
      if (!telegramId || parsed?.telegramId !== telegramId) return response();
      const profile = await getProfile(admin, telegramId);
      if (!profile) return response();
      const payment = await recordStarsPayment({
        admin,
        userId: profile.id,
        payment: message.successful_payment,
      });
      if (!payment) {
        // A non-2xx response makes Telegram retry the update. The database RPC
        // is idempotent by telegram_payment_charge_id.
        return response("Payment fulfillment failed", 503);
      }
      if (payment && !payment.duplicate) {
        await sendMessage(
          botToken,
          message.chat.id,
          accessAfterPaymentMessage(payment.paidUntil),
          shortcutKeyboard({
            entitlement: null,
            trialUsed: true,
            trialActive: false,
            trialRemaining: 0,
            paidActive: true,
            paidUntil: payment.paidUntil,
            referralActive: false,
            referralUntil: null,
            accessUntil: payment.paidUntil,
            bonusCredits: 0,
            accessActive: true,
          })
        );
      }
      return response();
    }

    const rawCommandText = (message.text ?? message.caption ?? "").trim();
    const command = rawCommandText.split(/\s+/u)[0]?.split("@")[0]?.toLowerCase();
    const commandArgument = rawCommandText.split(/\s+/u)[1] ?? "";
    const supportedCommands = new Set([
      "/start",
      "/help",
      "/shortcut",
      "/shortcut_setup",
      "/shortcut_revoke",
      "/subscription",
      "/referral",
      "/reminders_off",
      "/reminders_on",
      "/set_shortcut_video",
      "/set_shortcut_gif",
      "/terms",
      "/paysupport",
      "/support",
    ]);
    if (!command || !supportedCommands.has(command)) return response();

    const chatId = message.chat.id;
    const telegramId = message.from?.id;

    if (command === "/set_shortcut_video" || command === "/set_shortcut_gif") {
      const adminTelegramId = Number(env("BOT_ADMIN_TELEGRAM_ID"));
      if (
        !telegramId ||
        !Number.isSafeInteger(adminTelegramId) ||
        telegramId !== adminTelegramId ||
        !privateChatOnly(chatId, telegramId)
      ) {
        return response();
      }
      if (
        !message.animation?.file_id ||
        (message.animation.file_size ?? 0) > 50_000_000
      ) {
        await sendMessage(
          botToken,
          chatId,
          "Пришлите GIF-анимацию с подписью /set_shortcut_video"
        );
        return response();
      }
      const { error: saveVideoError } = await admin.from("bot_settings").upsert({
        key: "shortcut_demo_animation_file_id",
        value: message.animation.file_id,
      });
      await sendMessage(
        botToken,
        chatId,
        saveVideoError ? "Не удалось сохранить GIF." : "GIF для /shortcut обновлена."
      );
      return response();
    }

    if (command === "/start") {
      let referralAccepted = false;
      if (telegramId && privateChatOnly(chatId, telegramId) && commandArgument.startsWith("ref_")) {
        const code = commandArgument.slice(4);
        const { data: referralOutcome } = await admin.rpc("register_shortcut_referral", {
          p_invitee_telegram_id: telegramId,
          p_code: code,
        });
        referralAccepted = referralOutcome === "registered" || referralOutcome === "already_registered";
      }
      await sendMessage(
        botToken,
        chatId,
        referralAccepted
          ? `${buildHomeMessage()}\n\nПо этой ссылке вы получите 7 дней доступа после первого расхода через Shortcut.`
          : buildHomeMessage(),
        mainKeyboard()
      );
      return response();
    }

    if (command === "/help") {
      if (!telegramId) return response();
      await sendHelpSection(botToken, admin, chatId, telegramId);
      return response();
    }

    if (command === "/terms") {
      await sendMessage(botToken, chatId, buildTermsMessage(), termsKeyboard());
      return response();
    }

    if (command === "/paysupport" || command === "/support") {
      await sendMessage(
        botToken,
        chatId,
        buildPaySupportMessage(),
        paymentSupportKeyboard()
      );
      return response();
    }

    if (!telegramId) return response();

    if (command === "/shortcut" || command === "/shortcut_setup") {
      await sendShortcutSection(botToken, admin, chatId, telegramId);
      return response();
    }

    if (command === "/subscription") {
      await sendSubscriptionSection(botToken, admin, chatId, telegramId);
      return response();
    }

    if (command === "/referral") {
      await sendReferralSection(botToken, admin, chatId, telegramId);
      return response();
    }

    if (command === "/reminders_off" || command === "/reminders_on") {
      if (!privateChatOnly(chatId, telegramId)) return response();
      const profile = await getProfile(admin, telegramId);
      if (!profile) {
        await sendMessage(botToken, chatId, profileMissingMessage(), openAppKeyboard());
        return response();
      }
      const enabled = command === "/reminders_on";
      await admin.from("shortcut_reminder_state").upsert({
        user_id: profile.id,
        enabled,
        ...(enabled
          ? { last_activity_at: new Date().toISOString(), reminder_stage: 0, last_sent_at: null }
          : {}),
      });
      await sendMessage(
        botToken,
        chatId,
        enabled
          ? "Напоминания включены. Писать будем редко и только по делу."
          : "Напоминания отключены. Включить снова: /reminders_on",
        mainKeyboard()
      );
      return response();
    }

    if (command === "/shortcut_revoke") {
      if (!privateChatOnly(chatId, telegramId)) {
        await sendMessage(botToken, chatId, "Напишите боту в личном чате.");
        return response();
      }
      await sendMessage(
        botToken,
        chatId,
        buildRevokeTokenMessage(),
        shortcutRevokeConfirmKeyboard()
      );
      return response();
    }

    return response();
  } catch {
    // Never log update bodies, Telegram users, credentials, or payment payloads.
    return response("Internal server error", 500);
  }
});
