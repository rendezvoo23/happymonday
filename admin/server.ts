import { timingSafeEqual } from "node:crypto";

interface AdminConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  password: string;
  host: string;
  port: number;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1_000;
const sessions = new Map<string, number>();

function parseEnv(contents: string): Record<string, string> {
  return contents
    .split(/\r?\n/)
    .reduce<Record<string, string>>((values, line) => {
      const normalized = line.trim();
      if (!normalized || normalized.startsWith("#")) return values;
      const separator = normalized.indexOf("=");
      if (separator <= 0) return values;
      values[normalized.slice(0, separator).trim()] = normalized
        .slice(separator + 1)
        .trim();
      return values;
    }, {});
}

async function loadConfig(): Promise<AdminConfig> {
  const source = await Bun.file(
    process.env.ADMIN_ENV_FILE ?? ".env.admin"
  ).text();
  const values = { ...parseEnv(source), ...process.env };
  const supabaseUrl = values.SUPABASE_URL;
  // Prefer Supabase's current secret key. Keep the legacy service-role key
  // only as a compatibility fallback for older local setups.
  const serviceRoleKey =
    values.SUPABASE_SECRET_KEY || values.SUPABASE_SERVICE_ROLE_KEY;
  const password = values.ADMIN_PASSWORD;
  if (!supabaseUrl || !serviceRoleKey || !password) {
    throw new Error(
      "Set SUPABASE_URL, SUPABASE_SECRET_KEY and ADMIN_PASSWORD in .env.admin"
    );
  }
  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    serviceRoleKey,
    password,
    host: values.ADMIN_HOST || "127.0.0.1",
    port: Number(values.ADMIN_PORT || 8787),
  };
}

function equal(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function readCookie(request: Request, key: string): string | null {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${key}=`));
  return value ? decodeURIComponent(value.slice(key.length + 1)) : null;
}

function authenticated(request: Request): boolean {
  const sessionId = readCookie(request, "whyspent_admin_session");
  if (!sessionId) return false;
  const expiresAt = sessions.get(sessionId);
  if (!expiresAt || expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return false;
  }
  return true;
}

function response(
  body: unknown,
  status = 200,
  headers: HeadersInit = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function requestIsFromPanel(request: Request): boolean {
  const origin = request.headers.get("origin");
  return (
    origin === "http://127.0.0.1:5174" || origin === "http://localhost:5174"
  );
}

async function forward(
  config: AdminConfig,
  payload: Record<string, unknown>
): Promise<Response> {
  const upstream = await fetch(
    `${config.supabaseUrl}/functions/v1/admin-operations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    }
  );
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ??
        "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function drainBroadcast(
  config: AdminConfig,
  broadcastId: string
): Promise<void> {
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const response = await forward(config, {
      action: "process_broadcast",
      broadcastId,
    });
    if (!response.ok) return;
    const result = (await response.json().catch(() => null)) as {
      pending?: number;
    } | null;
    if (!result?.pending) return;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
}

const config = await loadConfig();

Bun.serve({
  hostname: config.host,
  port: config.port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/session" && request.method === "GET") {
      return response({ authenticated: authenticated(request) });
    }
    if (!requestIsFromPanel(request))
      return response({ error: "Forbidden" }, 403);
    if (url.pathname === "/api/login" && request.method === "POST") {
      const body = (await request.json().catch(() => null)) as {
        password?: unknown;
      } | null;
      if (
        typeof body?.password !== "string" ||
        !equal(body.password, config.password)
      ) {
        return response({ error: "Неверный пароль" }, 401);
      }
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, Date.now() + SESSION_TTL_MS);
      return response({ ok: true }, 200, {
        "Set-Cookie": `whyspent_admin_session=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1_000}`,
      });
    }
    if (url.pathname === "/api/logout" && request.method === "POST") {
      const sessionId = readCookie(request, "whyspent_admin_session");
      if (sessionId) sessions.delete(sessionId);
      return response({ ok: true }, 200, {
        "Set-Cookie":
          "whyspent_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
      });
    }
    if (url.pathname !== "/api/operations" || request.method !== "POST") {
      return response({ error: "Not found" }, 404);
    }
    if (
      !authenticated(request) ||
      request.headers.get("x-whyspent-admin") !== "panel"
    ) {
      return response({ error: "Unauthorized" }, 401);
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return response({ error: "Invalid request" }, 400);
    }
    try {
      const result = await forward(config, body as Record<string, unknown>);
      if (
        (body as Record<string, unknown>).action === "create_broadcast" &&
        result.ok
      ) {
        const payload = (await result
          .clone()
          .json()
          .catch(() => null)) as { broadcastId?: string } | null;
        if (payload?.broadcastId)
          void drainBroadcast(config, payload.broadcastId);
      }
      return result;
    } catch {
      return response({ error: "Нет связи с сервером администрирования" }, 502);
    }
  },
});

console.log(`WhySpent admin API: http://${config.host}:${config.port}`);
