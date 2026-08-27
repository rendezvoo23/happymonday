// Low-frequency Shortcut inactivity reminders.
// Invoke once daily with X-WhySpent-Reminder-Secret.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";
import { htmlToTelegramMarkdownV2 } from "../_shared/shortcut.ts";

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

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function sendReminder(options: {
  botToken: string;
  telegramId: number;
  stage: number;
}): Promise<boolean> {
  const text =
    options.stage === 1
      ? "Небольшое напоминание: если сегодня были траты, добавьте их одной строкой — например, «обед 650»."
      : "Если накопились траты, добавьте их, когда будет удобно. Это последнее напоминание — дальше писать не будем.";
  const result = await fetch(
    `https://api.telegram.org/bot${options.botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: options.telegramId,
        text: htmlToTelegramMarkdownV2(text),
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Отключить напоминания", callback_data: "reminders_off" }],
          ],
        },
      }),
      signal: AbortSignal.timeout(8_000),
    }
  );
  return result.ok;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const reminderSecret = Deno.env.get("SHORTCUT_REMINDER_SECRET") ?? "";
  const provided = request.headers.get("x-whyspent-reminder-secret") ?? "";
  if (!reminderSecret || !constantTimeEqual(provided, reminderSecret)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!supabaseUrl || !botToken) return json({ error: "Server misconfiguration" }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.rpc("claim_shortcut_reminders", {
    p_limit: 100,
  });
  if (error) return json({ error: "Unable to claim reminders" }, 500);

  let sent = 0;
  for (const item of data ?? []) {
    try {
      if (
        await sendReminder({
          botToken,
          telegramId: item.telegram_id,
          stage: item.reminder_stage,
        })
      ) {
        sent += 1;
      }
    } catch {
      // A claimed reminder is intentionally not retried to keep messaging quiet.
    }
  }

  return json({ ok: true, claimed: data?.length ?? 0, sent });
});
