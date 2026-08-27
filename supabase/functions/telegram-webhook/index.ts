// Telegram webhook for payments and Apple Shortcut access.
// Required secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET.
// Payments additionally require PAYMENT_SUPPORT_CONTACT.
// Shortcut commands additionally require SHORTCUT_TOKEN_PEPPER.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";
import {
  escapeTelegramHtml,
  generateShortcutToken,
  hmacToken,
  htmlToTelegramRichMarkdown,
  htmlToTelegramMarkdownV2,
} from "../_shared/shortcut.ts";

function createAdminClient(url: string, serviceRoleKey: string) {
  return createClient<any>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type AdminClient = ReturnType<typeof createAdminClient>;

const SHORTCUT_TEMPLATE_URL =
  "https://www.icloud.com/shortcuts/cf942375022943f6b20a31b1905001f6";
const WHYSPENT_BOT_USERNAME = "WhySpentBot";
const WHYSPENT_APP_URL = "https://happymonday-ten.vercel.app";
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
const MAX_SHORTCUT_GUIDE_SCREENS = 6;

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
  photo?: Array<{
    file_id: string;
    file_size?: number;
  }>;
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

async function sendClassicMessage(
  botToken: string,
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>
): Promise<boolean> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: htmlToTelegramMarkdownV2(text),
    parse_mode: "MarkdownV2",
    disable_web_page_preview: true,
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return callTelegram(botToken, "sendMessage", payload);
}

async function sendMessage(
  botToken: string,
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>
): Promise<boolean> {
  const richSent = await callTelegram(botToken, "sendRichMessage", {
    chat_id: chatId,
    rich_message: {
      markdown: htmlToTelegramRichMarkdown(text),
      skip_entity_detection: true,
    },
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
  if (richSent) return true;
  return sendClassicMessage(botToken, chatId, text, replyMarkup);
}

async function sendRichSection(options: {
  botToken: string;
  chatId: number;
  markdown: string;
  fallbackText: string;
  replyMarkup?: Record<string, unknown>;
}): Promise<boolean> {
  const richSent = await callTelegram(options.botToken, "sendRichMessage", {
    chat_id: options.chatId,
    rich_message: {
      markdown: options.markdown,
      skip_entity_detection: true,
    },
    ...(options.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
  });
  if (richSent) return true;
  return sendClassicMessage(
    options.botToken,
    options.chatId,
    options.fallbackText,
    options.replyMarkup
  );
}

async function sendRichHomeWithMedia(options: {
  botToken: string;
  chatId: number;
  fileId: string;
  mediaType: "animation" | "video";
  referralAccepted: boolean;
  replyMarkup: Record<string, unknown>;
}): Promise<boolean> {
  const mediaId = "home_demo";
  return callTelegram(options.botToken, "sendRichMessage", {
    chat_id: options.chatId,
    rich_message: {
      markdown: buildHomeRichMessage(options.referralAccepted, mediaId),
      media: [
        {
          id: mediaId,
          media: { type: options.mediaType, media: options.fileId },
        },
      ],
      skip_entity_detection: true,
    },
    reply_markup: options.replyMarkup,
  });
}

async function sendVideo(
  botToken: string,
  chatId: number,
  fileId: string,
  caption: string,
  replyMarkup?: Record<string, unknown>
): Promise<boolean> {
  return callTelegram(botToken, "sendVideo", {
    chat_id: chatId,
    video: fileId,
    supports_streaming: true,
    caption: htmlToTelegramMarkdownV2(caption),
    parse_mode: "MarkdownV2",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function sendAnimation(
  botToken: string,
  chatId: number,
  fileId: string,
  caption: string,
  replyMarkup?: Record<string, unknown>
): Promise<boolean> {
  return callTelegram(botToken, "sendAnimation", {
    chat_id: chatId,
    animation: fileId,
    caption: htmlToTelegramMarkdownV2(caption),
    parse_mode: "MarkdownV2",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function sendShortcutGuide(
  botToken: string,
  chatId: number,
  fileIds: string[]
): Promise<boolean> {
  if (fileIds.length === 0) return false;
  if (fileIds.length === 1) {
    return callTelegram(botToken, "sendPhoto", {
      chat_id: chatId,
      photo: fileIds[0],
    });
  }
  return callTelegram(botToken, "sendMediaGroup", {
    chat_id: chatId,
    media: fileIds.map((fileId) => ({ type: "photo", media: fileId })),
  });
}

function shortcutAccessSummary(state: ShortcutState): string {
  if (state.accessActive) {
    if ((state.paidActive || state.referralActive) && state.accessUntil) {
      return `Доступ активен до ${formatDateTime(state.accessUntil)}.`;
    }
    if (state.trialActive) {
      return `Пробный доступ: осталось ${state.trialRemaining} добавлений.`;
    }
    return `Ранее начисленный бонус: ${state.bonusCredits} добавлений.`;
  }
  if (!state.trialUsed) return "Первый запуск: 24 часа и 10 добавлений бесплатно.";
  return `Доступ на 30 дней — ${SHORTCUT_MONTH_STARS} ⭐️.`;
}

async function sendRichShortcutGuide(options: {
  botToken: string;
  chatId: number;
  fileIds: string[];
  state: ShortcutState;
  replyMarkup: Record<string, unknown>;
}): Promise<boolean> {
  if (options.fileIds.length < 2) return false;

  const media: Array<{
    id: string;
    media: { type: "photo"; media: string };
  }> = options.fileIds.map((fileId, index) => ({
    id: `shortcut_screen_${index + 1}`,
    media: { type: "photo", media: fileId },
  }));
  const slides = media
    .map((item, index) => `![Шаг ${index + 1}](tg://photo?id=${item.id})`)
    .join("\n");
  const markdown = [
    "## Apple Shortcut",
    "Добавляйте расходы с iPhone одной строкой.",
    "",
    "<tg-slideshow>",
    slides,
    "</tg-slideshow>",
    "",
    "<details>",
    "<summary>Как подключить</summary>",
    "",
    "1. Установите Shortcut.",
    "2. Вставьте токен в первое верхнее поле.",
    "3. Запустите Shortcut и напишите: `кофе 350`.",
    "",
    "</details>",
    "",
    shortcutAccessSummary(options.state),
  ].join("\n");

  return callTelegram(options.botToken, "sendRichMessage", {
    chat_id: options.chatId,
    rich_message: {
      markdown,
      media,
      skip_entity_detection: true,
    },
    reply_markup: options.replyMarkup,
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
    title: "WhySpent Plus на месяц",
    description: "Быстрое добавление расходов с iPhone через Apple Shortcut.",
    payload,
    provider_token: "",
    currency: "XTR",
    prices: [{ label: "WhySpent Plus, 30 дней", amount: SHORTCUT_MONTH_STARS }],
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

function mainKeyboard(includeOpenApp = true): Record<string, unknown> {
  const rows: Array<Array<Record<string, unknown>>> = [
    [{ text: "Подключить Apple Shortcut", callback_data: "shortcut" }],
    [{ text: "Подписка", callback_data: "subscription" }],
    [{ text: "Пригласить друга", callback_data: "referral" }],
    [{ text: "Помощь и настройки", callback_data: "help" }],
  ];
  if (includeOpenApp) {
    rows.push([{ text: "Открыть WhySpent", web_app: { url: WHYSPENT_APP_URL } }]);
  }
  return {
    inline_keyboard: rows,
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

  rows.push([{ text: "Подписка", callback_data: "subscription" }]);
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

function tokenKeyboard(token: string): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: "Скопировать токен", copy_text: { text: token } }],
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
    "<b>✦ WhySpent</b>",
    "",
    "Учёт расходов, который не отвлекает.",
    "Добавляйте покупки через Apple Shortcut и следите за бюджетом в приложении.",
    "",
    "Выберите нужный раздел ниже.",
  ].join("\n");
}

function buildHelpMessage(): string {
  return [
    "<b>🛠 Помощь и настройки</b>",
    "",
    "Здесь можно настроить редкие напоминания или обратиться по вопросу оплаты.",
    "Если Shortcut не работает, откройте «Подключить Apple Shortcut» и получите новый токен.",
  ].join("\n");
}

function buildTermsMessage(): string {
  return [
    "<b>✦ Условия оплаты</b>",
    "",
    `250 ⭐️ дают WhySpent Plus на ${SHORTCUT_MONTH_DAYS} дней.`,
    "WhySpent Plus даёт безлимитное добавление расходов через Apple Shortcut и ранний доступ к новым функциям.",
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
    "<b>🛠 Поддержка по платежам</b>",
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
      "<b>✦ WhySpent Plus активен</b>",
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
      "<b>✦ WhySpent Plus активен</b>",
      "",
      `Shortcut работает до ${formatDateTime(state.referralUntil)}.`,
      `После этого WhySpent Plus на 30 дней стоит ${SHORTCUT_MONTH_STARS} ⭐️.`,
      "Оплата означает согласие с условиями /terms.",
    ].join("\n");
  }

  if (state?.trialActive && state.entitlement?.trial_ends_at) {
    return [
      "<b>✦ Пробный доступ к WhySpent Plus активен</b>",
      "",
      `Осталось добавлений: ${state.trialRemaining}.`,
      `После пробного периода WhySpent Plus на 30 дней стоит ${SHORTCUT_MONTH_STARS} ⭐️.`,
      "Оплата означает согласие с условиями /terms.",
    ].join("\n");
  }

  return [
    "<b>✦ WhySpent Plus</b>",
    "",
    `Apple Shortcut на 30 дней — ${SHORTCUT_MONTH_STARS} ⭐️.`,
    ...(state && !state.trialUsed ? ["Первый запуск: 24 часа и 10 добавлений бесплатно."] : []),
    "",
    "Оплачивая счёт, вы принимаете условия /terms.",
  ].join("\n");
}

function buildTokenMessage(token: string): string {
  return [
    "<b>🔑 Токен для Shortcut</b>",
    "",
    `<code>${escapeTelegramHtml(token)}</code>`,
    "",
    "Вставьте его в первое верхнее поле Shortcut.",
    "Остальное уже настроено.",
  ].join("\n");
}

function buildTokenRichMessage(token: string): string {
  return [
    "# 🔑 Токен для Shortcut",
    "",
    "```",
    token,
    "```",
    "",
    "Вставьте его в первое верхнее поле Shortcut.",
    "",
    "Остальное уже настроено.",
  ].join("\n");
}

function buildShortcutManagementMessage(): string {
  return [
    "<b>🔑 Управление токеном</b>",
    "",
    "Новый токен сразу отключит предыдущий.",
    "Отзыв отключит все токены на ваших устройствах.",
  ].join("\n");
}

function buildRevokeTokenMessage(): string {
  return [
    "<b>🔑 Отозвать все токены?</b>",
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
    "<b>🎁 7 дней WhySpent Plus каждому</b>",
    "",
    "Отправьте другу вашу ссылку.",
    `После его первого расхода через Apple Shortcut вы оба получите по ${REFERRAL_REWARD_DAYS} дней WhySpent Plus.`,
    `Вам начисляются дни за первых ${MAX_REWARDED_REFERRALS} друзей.`,
    "",
    `Получили доступ: ${options.rewarded}`,
    `Ещё не добавили расход: ${options.pending}`,
  ].join("\n");
}

function referralKeyboard(code: string, canInvite: boolean): Record<string, unknown> {
  const referralUrl = `https://t.me/${WHYSPENT_BOT_USERNAME}?start=ref_${code}`;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(
    `Попробуй WhySpent — расходы добавляются с iPhone одной строкой. После первого расхода через Apple Shortcut мы оба получим по ${REFERRAL_REWARD_DAYS} дней WhySpent Plus.`
  )}`;
  return {
    inline_keyboard: [
      ...(canInvite ? [[{ text: "Поделиться ссылкой", url: shareUrl }]] : []),
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
    "<b>✦ WhySpent Plus активен</b>",
    "",
    `Apple Shortcut доступен до ${formatDateTime(paidUntil)}.`,
    "Теперь можно получить токен и добавить первый расход.",
  ].join("\n");
}

function buildHomeRichMessage(referralAccepted = false, mediaId?: string): string {
  return [
    "# ✦ WhySpent",
    "",
    ...(mediaId ? [`![WhySpent](tg://video?id=${mediaId})`, ""] : []),
    "Учёт расходов, который не отвлекает.",
    "",
    "Добавляйте покупки через Apple Shortcut и следите за бюджетом в приложении.",
    "",
    "<details>",
    "<summary>Больше возможностей</summary>",
    "",
    "- WhySpent Plus даёт безлимитное добавление расходов через Shortcut и ранний доступ к новым функциям.",
    "- Пригласите друга — после первой записи вы оба получите 7 дней WhySpent Plus.",
    "- Редкие напоминания помогают не выпадать из учёта расходов.",
    "",
    "</details>",
    ...(referralAccepted
      ? [
          "",
          "🎁 По этой ссылке вы получите 7 дней WhySpent Plus после первого расхода через Apple Shortcut.",
        ]
      : []),
  ].join("\n");
}

function buildSubscriptionRichMessage(state: ShortcutState | null): string {
  let status: string;
  if (state?.paidActive && state.paidUntil) {
    status = `✦ WhySpent Plus активен до ${formatDateTime(state.paidUntil)}.`;
  } else if (state?.referralActive && state.referralUntil) {
    status = `🎁 Доступ по приглашению активен до ${formatDateTime(state.referralUntil)}.`;
  } else if (state?.trialActive) {
    status = `Пробный доступ: осталось ${state.trialRemaining} добавлений.`;
  } else if (state && !state.trialUsed) {
    status = "Первый запуск: 24 часа и 10 добавлений бесплатно.";
  } else {
    status = `WhySpent Plus на 30 дней — ${SHORTCUT_MONTH_STARS} ⭐️.`;
  }

  return [
    "# Подписка",
    "",
    status,
    "",
    "<details>",
    "<summary>Что даёт WhySpent Plus</summary>",
    "",
    "- Безлимитное добавление расходов через Apple Shortcut",
    "- Ранний доступ к новым функциям",
    "- Личный токен для ваших устройств",
    "- Доступ на всех ваших устройствах",
    "",
    "</details>",
  ].join("\n");
}

function buildHelpRichMessage(): string {
  return [
    "# 🛠 Помощь и настройки",
    "",
    "Настройте напоминания или обратитесь по вопросу оплаты.",
    "",
    "<details>",
    "<summary>Shortcut не работает</summary>",
    "",
    "1. Откройте Apple Shortcut.",
    "2. Получите новый токен в разделе Shortcut.",
    "3. Вставьте его в первое поле команды.",
    "",
    "</details>",
  ].join("\n");
}

function buildReferralRichMessage(options: { rewarded: number; pending: number }): string {
  return [
    "# 🎁 Приглашения",
    "",
    "Пригласите друга — после его первого расхода через Apple Shortcut вы оба получите 7 дней WhySpent Plus.",
    "",
    "<details>",
    "<summary>Как получить дни</summary>",
    "",
    "1. Отправьте другу вашу ссылку.",
    "2. Друг откроет WhySpent и подключит Shortcut.",
    "3. После его первого расхода доступ появится у вас обоих.",
    "",
    "</details>",
    "",
    `Получили доступ: ${options.rewarded}`,
    `Ещё не добавили расход: ${options.pending}`,
  ].join("\n");
}

function buildTermsRichMessage(): string {
  return [
    "# ✦ Условия оплаты",
    "",
    `WhySpent Plus на ${SHORTCUT_MONTH_DAYS} дней — ${SHORTCUT_MONTH_STARS} ⭐️.`,
    "",
    "<details>",
    "<summary>Важно</summary>",
    "",
    "- Покупка разовая, без автопродления.",
    "- Новый срок прибавляется к уже оплаченному.",
    "- По вопросам оплаты используйте кнопку «Поддержка».",
    "",
    "</details>",
  ].join("\n");
}

function buildPaySupportRichMessage(): string {
  const contact = env("PAYMENT_SUPPORT_CONTACT");
  const username = contact
    ?.trim()
    .replace(/^https?:\/\/t\.me\//iu, "")
    .replace(/^@/u, "")
    .replace(/\/$/u, "");
  const contactLine = username && /^[A-Za-z0-9_]{5,32}$/u.test(username)
    ? `Напишите: [@${username}](https://t.me/${username}).`
    : contact
      ? `Напишите: ${contact}.`
      : "Контакт поддержки пока не настроен.";
  return [
    "# 🛠 Поддержка по платежам",
    "",
    contactLine,
    "",
    "<details>",
    "<summary>Что указать в сообщении</summary>",
    "",
    "- Дату платежа",
    "- Описание ситуации",
    "",
    "Не отправляйте токен Shortcut.",
    "",
    "</details>",
  ].join("\n");
}

function openAppKeyboard(): Record<string, unknown> {
  return {
    inline_keyboard: [
      [{ text: "Открыть WhySpent", web_app: { url: WHYSPENT_APP_URL } }],
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
  const guideKeys = Array.from(
    { length: MAX_SHORTCUT_GUIDE_SCREENS },
    (_, index) => `shortcut_guide_screen_${index + 1}`
  );
  const { data: guideSettings } = await admin
    .from("bot_settings")
    .select("key,value")
    .in("key", guideKeys);
  const guideByKey = new Map(
    (guideSettings ?? []).map((setting) => [setting.key as string, setting.value as string])
  );
  const guideFileIds = guideKeys
    .map((key) => guideByKey.get(key))
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const state = await loadShortcutState(admin, profile.id);
  const keyboard = shortcutKeyboard(state);
  if (
    await sendRichShortcutGuide({
      botToken,
      chatId,
      fileIds: guideFileIds,
      state,
      replyMarkup: keyboard,
    })
  ) {
    return;
  }
  await sendShortcutGuide(botToken, chatId, guideFileIds);
  await sendMessage(
    botToken,
    chatId,
    buildShortcutMessage(state),
    keyboard
  );
}

async function sendHomeSection(
  botToken: string,
  admin: AdminClient,
  chatId: number,
  referralAccepted = false,
  includeOpenApp = true
): Promise<void> {
  const { data: demoSettings } = await admin
    .from("bot_settings")
    .select("key,value")
    .in("key", [
      "start_demo_animation_file_id",
      "shortcut_demo_animation_file_id",
      "shortcut_demo_video_file_id",
    ]);
  const setting = (key: string) => demoSettings?.find((item) => item.key === key)?.value;
  const message = referralAccepted
    ? `${buildHomeMessage()}\n\nПо этой ссылке вы получите 7 дней WhySpent Plus после первого расхода через Apple Shortcut.`
    : buildHomeMessage();
  const richMessage = buildHomeRichMessage(referralAccepted);
  const keyboard = mainKeyboard(includeOpenApp);

  const animationFileId = setting("start_demo_animation_file_id") ?? setting("shortcut_demo_animation_file_id");
  if (animationFileId) {
    if (
      await sendRichHomeWithMedia({
        botToken,
        chatId,
        fileId: animationFileId,
        mediaType: "animation",
        referralAccepted,
        replyMarkup: keyboard,
      })
    ) {
      return;
    }
    if (await sendAnimation(botToken, chatId, animationFileId, "")) {
      await sendRichSection({ botToken, chatId, markdown: richMessage, fallbackText: message, replyMarkup: keyboard });
      return;
    }
  }

  const legacyVideoFileId = setting("shortcut_demo_video_file_id");
  if (legacyVideoFileId) {
    if (
      await sendRichHomeWithMedia({
        botToken,
        chatId,
        fileId: legacyVideoFileId,
        mediaType: "video",
        referralAccepted,
        replyMarkup: keyboard,
      })
    ) {
      return;
    }
    if (await sendVideo(botToken, chatId, legacyVideoFileId, "")) {
      await sendRichSection({ botToken, chatId, markdown: richMessage, fallbackText: message, replyMarkup: keyboard });
      return;
    }
  }

  await sendRichSection({ botToken, chatId, markdown: richMessage, fallbackText: message, replyMarkup: keyboard });
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
  const pending = rows.filter((item) => item.status === "pending").length;
  await sendRichSection({
    botToken,
    chatId,
    markdown: buildReferralRichMessage({ rewarded, pending }),
    fallbackText: buildReferralMessage({ rewarded, pending }),
    replyMarkup: referralKeyboard(code, rewarded < MAX_REWARDED_REFERRALS),
  });
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
  await sendRichSection({
    botToken,
    chatId,
    markdown: buildSubscriptionRichMessage(state),
    fallbackText: buildSubscriptionMessage(state),
    replyMarkup: subscriptionKeyboard(state),
  });
}

async function sendHelpSection(
  botToken: string,
  admin: AdminClient,
  chatId: number,
  telegramId: number
): Promise<void> {
  const profile = await getProfile(admin, telegramId);
  if (!profile) {
    await sendRichSection({
      botToken,
      chatId,
      markdown: buildHelpRichMessage(),
      fallbackText: buildHelpMessage(),
      replyMarkup: mainKeyboard(),
    });
    return;
  }
  const remindersEnabled = await remindersEnabledForUser(admin, profile.id);
  await sendRichSection({
    botToken,
    chatId,
    markdown: buildHelpRichMessage(),
    fallbackText: buildHelpMessage(),
    replyMarkup: helpKeyboard(remindersEnabled),
  });
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
        if (!privateChatOnly(chatId, telegramId)) {
          await sendMessage(botToken, chatId, "Напишите боту в личном чате.");
          return response();
        }
        await sendRichSection({
          botToken,
          chatId,
          markdown: buildHomeRichMessage(),
          fallbackText: buildHomeMessage(),
          replyMarkup: mainKeyboard(),
        });
        return response();
      }
      if (callback.data === "help") {
        await sendHelpSection(botToken, admin, chatId, telegramId);
        return response();
      }
      if (callback.data === "terms") {
        await sendRichSection({
          botToken,
          chatId,
          markdown: buildTermsRichMessage(),
          fallbackText: buildTermsMessage(),
          replyMarkup: termsKeyboard(),
        });
        return response();
      }
      if (callback.data === "paysupport") {
        await sendRichSection({
          botToken,
          chatId,
          markdown: buildPaySupportRichMessage(),
          fallbackText: buildPaySupportMessage(),
          replyMarkup: paymentSupportKeyboard(),
        });
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
        if (issued.ok) {
          await sendRichSection({
            botToken,
            chatId,
            markdown: buildTokenRichMessage(issued.token),
            fallbackText: buildTokenMessage(issued.token),
            replyMarkup: tokenKeyboard(issued.token),
          });
        } else {
          await sendMessage(
            botToken,
            chatId,
            "Не удалось создать токен. Попробуйте позже.",
            shortcutKeyboard(state)
          );
        }
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
    const shortcutScreenCommand = command?.match(/^\/set_shortcut_screen_([1-6])$/u);
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
      "/set_start_gif",
      "/terms",
      "/paysupport",
      "/support",
    ]);
    if (!command || (!supportedCommands.has(command) && !shortcutScreenCommand)) {
      return response();
    }

    const chatId = message.chat.id;
    const telegramId = message.from?.id;

    if (command === "/set_start_gif") {
      const adminTelegramId = Number(env("BOT_ADMIN_TELEGRAM_ID"));
      if (
        !telegramId ||
        !Number.isSafeInteger(adminTelegramId) ||
        telegramId !== adminTelegramId ||
        !privateChatOnly(chatId, telegramId)
      ) {
        return response();
      }
      if (!message.animation?.file_id || (message.animation.file_size ?? 0) > 50_000_000) {
        await sendMessage(
          botToken,
          chatId,
          "Пришлите GIF-анимацию с подписью /set_start_gif"
        );
        return response();
      }
      const { error: saveVideoError } = await admin.from("bot_settings").upsert(
        [{ key: "start_demo_animation_file_id", value: message.animation.file_id }]
      );
      await sendMessage(
        botToken,
        chatId,
        saveVideoError
          ? "Не удалось сохранить GIF."
          : "GIF для /start обновлена."
      );
      return response();
    }

    if (shortcutScreenCommand) {
      const adminTelegramId = Number(env("BOT_ADMIN_TELEGRAM_ID"));
      if (
        !telegramId ||
        !Number.isSafeInteger(adminTelegramId) ||
        telegramId !== adminTelegramId ||
        !privateChatOnly(chatId, telegramId)
      ) {
        return response();
      }
      const screenNumber = Number(shortcutScreenCommand[1]);
      const photo = message.photo?.at(-1);
      if (!photo?.file_id || (photo.file_size ?? 0) > 10_000_000) {
        await sendMessage(
          botToken,
          chatId,
          `Пришлите изображение с подписью /set_shortcut_screen_${screenNumber}`
        );
        return response();
      }
      // Screen 1 starts a fresh guide. This prevents screenshots from an older
      // version of the instruction from remaining in the slideshow.
      if (screenNumber === 1) {
        const staleGuideKeys = Array.from(
          { length: MAX_SHORTCUT_GUIDE_SCREENS - 1 },
          (_, index) => `shortcut_guide_screen_${index + 2}`
        );
        const { error: clearScreensError } = await admin
          .from("bot_settings")
          .delete()
          .in("key", staleGuideKeys);
        if (clearScreensError) {
          await sendMessage(botToken, chatId, "Не удалось обновить галерею. Попробуйте ещё раз.");
          return response();
        }
      }
      const { error: saveScreenError } = await admin.from("bot_settings").upsert({
        key: `shortcut_guide_screen_${screenNumber}`,
        value: photo.file_id,
      });
      await sendMessage(
        botToken,
        chatId,
        saveScreenError
          ? "Не удалось сохранить скриншот."
          : `Скриншот ${screenNumber} сохранён.`
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
      await sendHomeSection(
        botToken,
        admin,
        chatId,
        referralAccepted,
        Boolean(telegramId && privateChatOnly(chatId, telegramId))
      );
      return response();
    }

    if (command === "/help") {
      if (!telegramId) return response();
      if (!privateChatOnly(chatId, telegramId)) {
        await sendMessage(botToken, chatId, "Напишите боту в личном чате.");
        return response();
      }
      await sendHelpSection(botToken, admin, chatId, telegramId);
      return response();
    }

    if (command === "/terms") {
      await sendRichSection({
        botToken,
        chatId,
        markdown: buildTermsRichMessage(),
        fallbackText: buildTermsMessage(),
        replyMarkup: termsKeyboard(),
      });
      return response();
    }

    if (command === "/paysupport" || command === "/support") {
      await sendRichSection({
        botToken,
        chatId,
        markdown: buildPaySupportRichMessage(),
        fallbackText: buildPaySupportMessage(),
        replyMarkup: paymentSupportKeyboard(),
      });
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
