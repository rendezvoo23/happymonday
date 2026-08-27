// Internal API used only by the local WhySpent admin panel.
// The local panel keeps the service-role key on its Bun server; it never
// reaches the browser. Do not expose this endpoint through a public client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";

const MAX_BODY_BYTES = 32_000;
const MAX_BROADCAST_RECIPIENTS = 20_000;
const BROADCAST_BATCH_SIZE = 20;
const TELEGRAM_MESSAGE_LIMIT = 3_000;

type Segment =
  | "all"
  | "paid"
  | "trial"
  | "referral"
  | "active_7d"
  | "inactive_14d";

type AccessKind = "paid" | "referral" | "trial";

type AdminClient = ReturnType<typeof createAdminClient>;

function createAdminClient(url: string, serviceRoleKey: string) {
  return createClient<any>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

function constantTimeEqual(left: string, right: string): boolean {
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isSegment(value: unknown): value is Segment {
  return typeof value === "string" && [
    "all",
    "paid",
    "trial",
    "referral",
    "active_7d",
    "inactive_14d",
  ].includes(value);
}

function isAccessKind(value: unknown): value is AccessKind {
  return value === "paid" || value === "referral" || value === "trial";
}

function validDays(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 3_650;
}

function parseAdminTelegramIds(): number[] {
  return (Deno.env.get("ADMIN_TELEGRAM_IDS") ?? "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
}

function env(name: string): string | null {
  return Deno.env.get(name) ?? null;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function addDays(base: Date, days: number): string {
  return new Date(base.getTime() + days * 86_400_000).toISOString();
}

function latestFuture(...values: Array<string | null | undefined>): Date {
  const now = new Date();
  const future = values
    .filter((value): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value)))
    .map((value) => new Date(value))
    .filter((value) => value > now)
    .sort((left, right) => right.getTime() - left.getTime());
  return future[0] ?? now;
}

function presentUser(row: any) {
  const entitlement = Array.isArray(row.shortcut_entitlements)
    ? row.shortcut_entitlements[0]
    : row.shortcut_entitlements ?? null;
  const reminderState = Array.isArray(row.shortcut_reminder_state)
    ? row.shortcut_reminder_state[0]
    : row.shortcut_reminder_state ?? null;
  const tokens = Array.isArray(row.shortcut_access_tokens)
    ? row.shortcut_access_tokens
    : [];
  const now = Date.now();
  const paidActive = Date.parse(entitlement?.paid_until ?? "") > now;
  const referralActive = Date.parse(entitlement?.referral_access_until ?? "") > now;
  const trialActive = Date.parse(entitlement?.trial_ends_at ?? "") > now;

  return {
    id: row.id,
    telegramId: row.telegram_id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    createdAt: row.created_at,
    lastActivityAt: reminderState?.last_activity_at ?? null,
    remindersEnabled: reminderState?.enabled ?? true,
    access: paidActive ? "paid" : referralActive ? "referral" : trialActive ? "trial" : "expired",
    paidUntil: entitlement?.paid_until ?? null,
    referralAccessUntil: entitlement?.referral_access_until ?? null,
    trialEndsAt: entitlement?.trial_ends_at ?? null,
    trialRequestLimit: entitlement?.trial_request_limit ?? null,
    activeTokenCount: Number.isFinite(Number(row.active_token_count))
      ? Number(row.active_token_count)
      : tokens.filter((token: any) => !token.revoked_at).length,
  };
}

async function addAudit(
  admin: AdminClient,
  actorTelegramId: number,
  action: string,
  metadata: Record<string, unknown>,
  targetUserId?: string,
  targetBroadcastId?: string,
): Promise<void> {
  const { error } = await admin.from("admin_audit_log").insert({
    actor_telegram_id: actorTelegramId,
    action,
    target_user_id: targetUserId ?? null,
    target_broadcast_id: targetBroadcastId ?? null,
    metadata,
  });
  if (error) throw new Error("audit_failed");
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
): Promise<{ ok: boolean; retryAfter?: number; error?: string }> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return { ok: true };
    const payload = await response.json().catch(() => null) as {
      description?: string;
      parameters?: { retry_after?: number };
    } | null;
    return {
      ok: false,
      retryAfter: payload?.parameters?.retry_after,
      error: payload?.description?.slice(0, 500) ?? `Telegram ${response.status}`,
    };
  } catch {
    return { ok: false, error: "Telegram network error" };
  }
}

async function getAudience(admin: AdminClient, segment: Segment) {
  const { data, error } = await admin.rpc("admin_audience_members", { p_segment: segment });
  if (error) throw new Error("audience_lookup_failed");
  return (data ?? []) as Array<{ user_id: string; telegram_id: number }>;
}

async function processBroadcast(
  admin: AdminClient,
  botToken: string,
  broadcastId: string,
): Promise<{ sent: number; failed: number; pending: number; status: string }> {
  const { data: broadcast, error: broadcastError } = await admin
    .from("admin_broadcasts")
    .select("id,status")
    .eq("id", broadcastId)
    .maybeSingle();
  if (broadcastError || !broadcast) throw new Error("broadcast_not_found");
  if (["completed", "completed_with_errors", "cancelled"].includes(broadcast.status)) {
    return { sent: 0, failed: 0, pending: 0, status: broadcast.status };
  }

  await admin
    .from("admin_broadcasts")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", broadcastId)
    .in("status", ["queued", "processing"]);

  const { data: claimed, error: claimError } = await admin.rpc("claim_admin_broadcast_deliveries", {
    p_broadcast_id: broadcastId,
    p_limit: BROADCAST_BATCH_SIZE,
  });
  if (claimError) throw new Error("broadcast_claim_failed");

  let sent = 0;
  let failed = 0;
  for (const delivery of claimed ?? []) {
    const result = await sendTelegramMessage(botToken, delivery.telegram_id, delivery.message);
    if (result.ok) {
      sent += 1;
      await admin.from("admin_broadcast_deliveries").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        last_error: null,
      }).eq("id", delivery.id);
    } else if (delivery.attempts < 3) {
      const retryAfter = Math.max(5, Math.min(result.retryAfter ?? 20, 300));
      await admin.from("admin_broadcast_deliveries").update({
        status: "queued",
        next_attempt_at: new Date(Date.now() + retryAfter * 1_000).toISOString(),
        last_error: result.error ?? "Unable to deliver message",
      }).eq("id", delivery.id);
    } else {
      failed += 1;
      await admin.from("admin_broadcast_deliveries").update({
        status: "failed",
        last_error: result.error ?? "Unable to deliver message",
      }).eq("id", delivery.id);
    }
    // Stay comfortably below Telegram's bot-wide send rate.
    await new Promise((resolve) => setTimeout(resolve, 70));
  }

  const { data: deliveries, error: deliveryError } = await admin
    .from("admin_broadcast_deliveries")
    .select("status")
    .eq("broadcast_id", broadcastId);
  if (deliveryError) throw new Error("broadcast_status_failed");

  const totals = (deliveries ?? []).reduce(
    (summary: { sent: number; failed: number; pending: number }, delivery: { status: string }) => {
      if (delivery.status === "sent") summary.sent += 1;
      else if (delivery.status === "failed") summary.failed += 1;
      else summary.pending += 1;
      return summary;
    },
    { sent: 0, failed: 0, pending: 0 },
  );
  const status = totals.pending > 0
    ? "processing"
    : totals.failed > 0 ? "completed_with_errors" : "completed";
  await admin.from("admin_broadcasts").update({
    status,
    sent_count: totals.sent,
    failed_count: totals.failed,
    completed_at: totals.pending === 0 ? new Date().toISOString() : null,
  }).eq("id", broadcastId);

  return { ...totals, status };
}

async function execute(
  admin: AdminClient,
  actorTelegramId: number,
  botToken: string,
  body: Record<string, unknown>,
): Promise<{ body: unknown; status?: number }> {
  const action = body.action;

  if (action === "overview") {
    const { data, error } = await admin.rpc("admin_dashboard_metrics");
    if (error) throw new Error("overview_failed");
    const { data: broadcasts, error: broadcastsError } = await admin
      .from("admin_broadcasts")
      .select("id,segment,status,audience_size,sent_count,failed_count,created_at")
      .order("created_at", { ascending: false })
      .limit(6);
    if (broadcastsError) throw new Error("broadcast_history_failed");
    return { body: { ok: true, metrics: data, broadcasts: broadcasts ?? [] } };
  }

  if (action === "users") {
    const page = Number.isInteger(body.page) ? Math.max(0, Number(body.page)) : 0;
    const pageSize = Number.isInteger(body.pageSize)
      ? Math.min(100, Math.max(10, Number(body.pageSize)))
      : 25;
    const search = typeof body.search === "string" ? body.search.trim().slice(0, 80) : "";
    const segment = body.segment === "paid" || body.segment === "trial" || body.segment === "referral" || body.segment === "expired"
      ? body.segment
      : "all";

    const { data, error } = await admin.rpc("admin_list_users", {
      p_search: search || null,
      p_segment: segment,
      p_limit: pageSize,
      p_offset: page * pageSize,
    });
    if (error) throw new Error("users_failed");
    const users = (data ?? []).map((row: any) => presentUser({
      ...row,
      shortcut_entitlements: {
        paid_until: row.paid_until,
        referral_access_until: row.referral_access_until,
        trial_ends_at: row.trial_ends_at,
        trial_request_limit: row.trial_request_limit,
      },
      shortcut_reminder_state: {
        last_activity_at: row.last_activity_at,
        enabled: row.reminders_enabled,
      },
      shortcut_access_tokens: [],
    }));
    return {
      body: {
        ok: true,
        users,
        total: Number(data?.[0]?.total_count ?? 0),
        page,
        pageSize,
      },
    };
  }

  if (action === "user") {
    if (!isUuid(body.userId)) return { body: { error: "Invalid user" }, status: 400 };
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id,telegram_id,username,first_name,last_name,display_name,created_at,shortcut_entitlements(*),shortcut_reminder_state(*),shortcut_access_tokens(id,label,created_at,last_used_at,revoked_at)")
      .eq("id", body.userId)
      .maybeSingle();
    if (profileError || !profile) return { body: { error: "User not found" }, status: 404 };
    const [payments, referrals, audit] = await Promise.all([
      admin.from("shortcut_payments").select("id,provider,amount,currency,status,created_at,access_granted_until").eq("user_id", body.userId).order("created_at", { ascending: false }).limit(10),
      admin.from("shortcut_referrals").select("id,status,inviter_rewarded,created_at,rewarded_at").or(`inviter_user_id.eq.${body.userId},invitee_user_id.eq.${body.userId}`).order("created_at", { ascending: false }).limit(10),
      admin.from("admin_audit_log").select("id,action,metadata,created_at,actor_telegram_id").eq("target_user_id", body.userId).order("created_at", { ascending: false }).limit(10),
    ]);
    if (payments.error || referrals.error || audit.error) throw new Error("user_detail_failed");
    return {
      body: {
        ok: true,
        user: presentUser(profile),
        tokens: profile.shortcut_access_tokens ?? [],
        payments: payments.data ?? [],
        referrals: referrals.data ?? [],
        audit: audit.data ?? [],
      },
    };
  }

  if (action === "adjust_access") {
    if (!isUuid(body.userId) || !isAccessKind(body.kind) || !validDays(body.days)) {
      return { body: { error: "Invalid access change" }, status: 400 };
    }
    const { data: current, error: currentError } = await admin
      .from("shortcut_entitlements")
      .select("paid_until,referral_access_until,trial_ends_at,trial_request_limit")
      .eq("user_id", body.userId)
      .maybeSingle();
    if (currentError) throw new Error("entitlement_lookup_failed");
    const now = new Date();
    const update: Record<string, unknown> = {};
    if (body.kind === "paid") {
      update.paid_until = addDays(latestFuture(current?.paid_until), body.days);
    } else if (body.kind === "referral") {
      update.referral_access_until = addDays(latestFuture(current?.referral_access_until, current?.paid_until), body.days);
    } else {
      update.trial_started_at = now.toISOString();
      update.trial_ends_at = addDays(now, body.days);
      update.trial_request_limit = Math.max(10, current?.trial_request_limit ?? 10);
    }
    const { error: updateError } = await admin.from("shortcut_entitlements").upsert({
      user_id: body.userId,
      ...update,
    });
    if (updateError) throw new Error("entitlement_update_failed");
    await addAudit(admin, actorTelegramId, "access_extended", { kind: body.kind, days: body.days }, body.userId);
    return { body: { ok: true } };
  }

  if (action === "revoke_access") {
    if (!isUuid(body.userId)) return { body: { error: "Invalid user" }, status: 400 };
    const { error } = await admin.from("shortcut_entitlements").upsert({
      user_id: body.userId,
      trial_started_at: null,
      trial_ends_at: null,
      paid_until: null,
      referral_access_until: null,
      bonus_request_credits: 0,
    });
    if (error) throw new Error("entitlement_revoke_failed");
    await addAudit(admin, actorTelegramId, "access_revoked", {}, body.userId);
    return { body: { ok: true } };
  }

  if (action === "revoke_tokens") {
    if (!isUuid(body.userId)) return { body: { error: "Invalid user" }, status: 400 };
    const { error } = await admin
      .from("shortcut_access_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", body.userId)
      .is("revoked_at", null);
    if (error) throw new Error("token_revoke_failed");
    await addAudit(admin, actorTelegramId, "shortcut_tokens_revoked", {}, body.userId);
    return { body: { ok: true } };
  }

  if (action === "audience") {
    if (!isSegment(body.segment)) return { body: { error: "Invalid audience" }, status: 400 };
    const audience = await getAudience(admin, body.segment);
    return { body: { ok: true, count: audience.length } };
  }

  if (action === "broadcast_test") {
    if (!isSegment(body.segment) || typeof body.message !== "string") {
      return { body: { error: "Invalid test message" }, status: 400 };
    }
    const message = body.message.trim();
    if (!message || message.length > TELEGRAM_MESSAGE_LIMIT) {
      return { body: { error: "Message must be between 1 and 3000 characters" }, status: 400 };
    }
    const result = await sendTelegramMessage(botToken, actorTelegramId, message);
    if (!result.ok) return { body: { error: "Unable to send test message" }, status: 502 };
    const hash = await sha256(message);
    const { data: test, error } = await admin.from("admin_broadcast_tests").insert({
      actor_telegram_id: actorTelegramId,
      segment: body.segment,
      message_hash: hash,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    }).select("id").single();
    if (error || !test) throw new Error("broadcast_test_failed");
    await addAudit(admin, actorTelegramId, "broadcast_test_sent", { segment: body.segment });
    return { body: { ok: true, testId: test.id } };
  }

  if (action === "create_broadcast") {
    if (!isSegment(body.segment) || typeof body.message !== "string" || !isUuid(body.testId)) {
      return { body: { error: "Invalid broadcast" }, status: 400 };
    }
    const message = body.message.trim();
    if (!message || message.length > TELEGRAM_MESSAGE_LIMIT) {
      return { body: { error: "Message must be between 1 and 3000 characters" }, status: 400 };
    }
    const hash = await sha256(message);
    const { data: test, error: testError } = await admin.from("admin_broadcast_tests")
      .select("id,segment,message_hash,expires_at,used_at,actor_telegram_id")
      .eq("id", body.testId)
      .maybeSingle();
    if (testError || !test || test.actor_telegram_id !== actorTelegramId || test.used_at || Date.parse(test.expires_at) <= Date.now() || test.segment !== body.segment || test.message_hash !== hash) {
      return { body: { error: "Send a new test before confirming this broadcast" }, status: 409 };
    }
    const audience = await getAudience(admin, body.segment);
    if (audience.length === 0) return { body: { error: "There are no recipients in this segment" }, status: 400 };
    if (audience.length > MAX_BROADCAST_RECIPIENTS) return { body: { error: "Audience is too large for one broadcast" }, status: 400 };

    const { data: broadcast, error: broadcastError } = await admin.from("admin_broadcasts").insert({
      actor_telegram_id: actorTelegramId,
      segment: body.segment,
      message,
      audience_size: audience.length,
      test_sent_at: new Date().toISOString(),
    }).select("id").single();
    if (broadcastError || !broadcast) throw new Error("broadcast_create_failed");
    try {
      for (let index = 0; index < audience.length; index += 500) {
        const rows = audience.slice(index, index + 500).map((recipient) => ({
          broadcast_id: broadcast.id,
          user_id: recipient.user_id,
          telegram_id: recipient.telegram_id,
        }));
        const { error: deliveryError } = await admin.from("admin_broadcast_deliveries").insert(rows);
        if (deliveryError) throw new Error("broadcast_recipients_failed");
      }
      const { error: consumeError } = await admin.from("admin_broadcast_tests")
        .update({ used_at: new Date().toISOString() })
        .eq("id", test.id)
        .is("used_at", null);
      if (consumeError) throw new Error("broadcast_test_consume_failed");
      await addAudit(admin, actorTelegramId, "broadcast_queued", { segment: body.segment, audienceSize: audience.length }, undefined, broadcast.id);
      return { body: { ok: true, broadcastId: broadcast.id, audienceSize: audience.length } };
    } catch (error) {
      await admin.from("admin_broadcasts").update({ status: "cancelled" }).eq("id", broadcast.id);
      throw error;
    }
  }

  if (action === "process_broadcast") {
    if (!isUuid(body.broadcastId)) return { body: { error: "Invalid broadcast" }, status: 400 };
    const result = await processBroadcast(admin, botToken, body.broadcastId);
    return { body: { ok: true, ...result } };
  }

  if (action === "broadcast_status") {
    if (!isUuid(body.broadcastId)) return { body: { error: "Invalid broadcast" }, status: 400 };
    const { data, error } = await admin.from("admin_broadcasts")
      .select("id,status,audience_size,sent_count,failed_count,created_at,completed_at")
      .eq("id", body.broadcastId)
      .maybeSingle();
    if (error || !data) return { body: { error: "Broadcast not found" }, status: 404 };
    return { body: { ok: true, broadcast: data } };
  }

  return { body: { error: "Unsupported action" }, status: 400 };
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseUrl = env("SUPABASE_URL");
  const botToken = env("TELEGRAM_BOT_TOKEN");
  const authorization = request.headers.get("authorization") ?? "";
  const providedKey = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const adminTelegramIds = parseAdminTelegramIds();
  if (!supabaseUrl || !botToken || !serviceRoleKey || adminTelegramIds.length === 0) {
    return json({ error: "Admin panel is not configured" }, 500);
  }
  if (!constantTimeEqual(providedKey, serviceRoleKey)) return json({ error: "Unauthorized" }, 401);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return json({ error: "Request too large" }, 413);
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return json({ error: "Request too large" }, 413);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  try {
    const result = await execute(
      createAdminClient(supabaseUrl, serviceRoleKey),
      adminTelegramIds[0],
      botToken,
      body,
    );
    return json(result.body, result.status);
  } catch (error) {
    console.error("admin-operation-failed", body.action, error instanceof Error ? error.message : "unknown");
    return json({ error: "Unable to complete this action" }, 500);
  }
});
