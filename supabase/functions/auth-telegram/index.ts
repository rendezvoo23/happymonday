// auth-telegram Edge Function for Supabase (Deno)
// Validates Telegram WebApp initData (hash) and returns a REAL Supabase session
// using: auth.admin.generateLink() -> auth.verifyOtp().
//
// REQUIRED SECRETS (Edge Functions -> Secrets):
// - TELEGRAM_BOT_TOKEN
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - SUPABASE_ANON_KEY
//
// IMPORTANT:
// - Turn OFF "Verify JWT" / "Require JWT" for this function (it's a login endpoint)
// - Do NOT expose SUPABASE_SERVICE_ROLE_KEY to the client
// - Make sure Email provider is enabled in Supabase Auth (we won't actually send emails)
// @ts-expect-error: Deno edge function types are provided by the runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ALLOWED_ORIGIN = "*";

function corsHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "content-type, apikey, x-client-info, authorization",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
    ...extra,
  };
}
function json(
  body: unknown,
  status = 200,
  extra: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(extra),
    },
  });
}
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function cryptoRandomString(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => (b % 36).toString(36))
    .join("");
}
function buildDataCheckString(params: URLSearchParams): string {
  const pairs: string[] = [];
  params.forEach((value, key) => pairs.push(`${key}=${value}`));
  pairs.sort((a, b) => {
    const ka = a.split("=")[0];
    const kb = b.split("=")[0];
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return pairs.join("\n");
}
async function hmacSha256Hex(
  keyBytes: Uint8Array,
  messageBytes: Uint8Array
): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    messageBytes as BufferSource
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
/**
 * Validates Telegram WebApp initData
 * @param initData - Telegram WebApp initData string
 * @param botToken - Telegram bot token (required in production, optional in dev mode)
 * @param isDev - If true, skips signature validation (useful for development/testing)
 */
async function validateTelegramInitData(
  initData: string,
  botToken: string | null,
  isDev = false
): Promise<
  | { ok: true; params: URLSearchParams }
  | { ok: false; error: string; dataCheckString?: string }
> {
  const params = new URLSearchParams(initData);

  // In dev mode, skip signature validation but still parse and validate structure
  if (isDev) {
    const user = params.get("user");
    if (!user) {
      return {
        ok: false,
        error: "Missing user in initData",
      };
    }
    // Remove hash if present to clean up params
    params.delete("hash");
    return {
      ok: true,
      params,
    };
  }

  // In production mode, botToken is required
  if (!botToken) {
    return {
      ok: false,
      error: "botToken is required in production mode",
    };
  }

  const receivedHash = params.get("hash");
  if (!receivedHash)
    return {
      ok: false,
      error: "Missing hash in initData",
    };
  // Replay protection (recommended)
  const authDate = Number(params.get("auth_date") || "0");
  const now = Math.floor(Date.now() / 1000);
  if (!authDate || now - authDate > 60 * 60) {
    return {
      ok: false,
      error: "initData is too old",
    };
  }
  // Remove hash from the signed string
  params.delete("hash");
  // NOTE: We keep all other fields as Telegram provided them (including `signature` if present)
  const dataCheckString = buildDataCheckString(params);
  // Telegram WebApp secret derivation:
  // secret_key = HMAC_SHA256(key="WebAppData", message=BOT_TOKEN)
  // hash       = HMAC_SHA256(key=secret_key, message=data_check_string)
  const enc = new TextEncoder();
  const webAppKey = await crypto.subtle.importKey(
    "raw",
    enc.encode("WebAppData"),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
  const secretKeyBuffer = await crypto.subtle.sign(
    "HMAC",
    webAppKey,
    enc.encode(botToken)
  );
  const secretKeyBytes = new Uint8Array(secretKeyBuffer);
  const generatedHash = await hmacSha256Hex(
    secretKeyBytes,
    enc.encode(dataCheckString)
  );
  const receivedHashNorm = receivedHash.toLowerCase();
  if (!timingSafeEqualHex(generatedHash, receivedHashNorm)) {
    return {
      ok: false,
      error: "Invalid Telegram initData signature",
      dataCheckString,
    };
  }
  return {
    ok: true,
    params,
  };
}
function parseTelegramUser(params: URLSearchParams): {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
} | null {
  const userRaw = params.get("user");
  if (!userRaw) return null;
  try {
    const u = JSON.parse(userRaw) as {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
      photo_url?: string;
    };
    const telegram_id = Number(u.id);
    if (!telegram_id || Number.isNaN(telegram_id)) return null;
    return {
      telegram_id,
      username: u.username ?? null,
      first_name: u.first_name ?? null,
      last_name: u.last_name ?? null,
      photo_url: u.photo_url ?? null,
    };
  } catch {
    return null;
  }
}
// @ts-expect-error: Deno.serve is provided by the Deno runtime
Deno.serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": req.headers.get("Origin") ?? "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            req.headers.get("Access-Control-Request-Headers") ??
            "content-type, apikey, x-client-info, authorization",
          "Access-Control-Max-Age": "600",
          Vary: "Origin",
        },
      });
    }
    if (req.method !== "POST") {
      return json(
        {
          error: "Method not allowed",
        },
        405
      );
    }
    const body = (await req.json().catch(() => null)) as {
      initData?: string;
      isDev?: boolean;
    } | null;
    if (!body || typeof body.initData !== "string") {
      return json(
        {
          error: "Missing or invalid initData",
        },
        400
      );
    }
    const isDev = body.isDev === true;

    // @ts-expect-error: Deno.env is provided by the Deno runtime
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    // @ts-expect-error: Deno.env is provided by the Deno runtime
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    // @ts-expect-error: Deno.env is provided by the Deno runtime
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    // @ts-expect-error: Deno.env is provided by the Deno runtime
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

    // TELEGRAM_BOT_TOKEN is only required in production mode (when isDev is false)
    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !SUPABASE_ANON_KEY ||
      (!isDev && !TELEGRAM_BOT_TOKEN)
    ) {
      return json(
        {
          error: "Server misconfiguration",
          missing: {
            SUPABASE_URL: !SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: !SUPABASE_SERVICE_ROLE_KEY,
            SUPABASE_ANON_KEY: !SUPABASE_ANON_KEY,
            TELEGRAM_BOT_TOKEN: !isDev && !TELEGRAM_BOT_TOKEN,
          },
        },
        500
      );
    }
    // 1) Validate Telegram initData
    const v = await validateTelegramInitData(
      body.initData,
      TELEGRAM_BOT_TOKEN ?? null,
      isDev
    );
    if (!v.ok) {
      return json(
        {
          error: v.error,
          ...(v.dataCheckString
            ? {
                dataCheckString: v.dataCheckString,
              }
            : {}),
        },
        401
      );
    }
    // 2) Parse Telegram user
    const params = v.params;
    const tgUser = parseTelegramUser(params);
    if (!tgUser)
      return json(
        {
          error: "Telegram user missing or invalid in initData.user",
        },
        400
      );
    const { telegram_id, username, first_name, last_name, photo_url } = tgUser;
    const display_name =
      [first_name, last_name].filter(Boolean).join(" ") || username || "";
    // 3) Create Supabase admin client with proper auth configuration
    // CRITICAL: Use global.headers to bypass JWT validation for admin operations
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        },
      }
    );
    
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    // 4) Find/create auth user + profile
    //    We use a deterministic "technical email" for magiclink flow
    const technicalEmail = `telegram_${telegram_id}@telegram.local`;
    
    // 4.1 find profile by telegram_id
    const { data: existingProfiles, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegram_id)
      .limit(1);
      
    if (profileErr)
      return json(
        {
          error: "Failed querying profiles",
          details: profileErr.message,
        },
        500
      );
      
    let userId = existingProfiles?.[0]?.id ?? null;
    
    // 4.2 create auth user if missing
    if (!userId) {
      const { data: createdUser, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: technicalEmail,
          password: cryptoRandomString(40),
          email_confirm: true,
          user_metadata: {
            telegram_id,
          },
        });
      if (createErr || !createdUser?.user?.id) {
        return json(
          {
            error: "Failed creating auth user",
            details: createErr?.message,
          },
          500
        );
      }
      userId = createdUser.user.id;
    }
    
    if (!userId)
      return json(
        {
          error: "Failed to determine user id",
        },
        500
      );
      
    // 4.3 upsert profile (id must equal auth.users.id)
    const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        telegram_id,
        username,
        first_name,
        last_name,
        display_name,
        photo_url,
      },
      {
        onConflict: "id",
      }
    );
    
    if (upsertErr)
      return json(
        {
          error: "Failed upserting profile",
          details: upsertErr.message,
        },
        500
      );
      
    // 4.4 ensure user_settings exists
    const { data: settingsRow, error: settingsErr } = await supabaseAdmin
      .from("user_settings")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
      
    if (settingsErr)
      return json(
        {
          error: "Failed querying user_settings",
          details: settingsErr.message,
        },
        500
      );
      
    if (!settingsRow) {
      const { error: insSetErr } = await supabaseAdmin
        .from("user_settings")
        .insert({
          user_id: userId,
          default_currency: "RUB",
        });
      if (insSetErr)
        return json(
          {
            error: "Failed creating user_settings",
            details: insSetErr.message,
          },
          500
        );
    }
    
    // 5) Mint a real Supabase session (generateLink -> verifyOtp)
    const { data: linkData, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: technicalEmail,
      });
      
    if (linkErr || !linkData) {
      return json(
        {
          error: "Failed generating magic link",
          details: linkErr?.message,
        },
        500
      );
    }
    
    // Supabase can return hashed token in different places depending on version
    const token_hash =
      linkData.properties?.hashed_token ||
      linkData.hashed_token ||
      linkData.properties?.email_otp ||
      null;
      
    if (!token_hash || typeof token_hash !== "string") {
      return json(
        {
          error: "Missing token_hash from generateLink response",
        },
        500
      );
    }
    
    const { data: verifyData, error: verifyErr } =
      await supabaseAnon.auth.verifyOtp({
        type: "magiclink",
        token_hash,
      });
      
    if (verifyErr || !verifyData?.session) {
      return json(
        {
          error: "Failed creating session via verifyOtp",
          details: verifyErr?.message,
        },
        500
      );
    }
    
    // 6) Return session to the client
    return json({
      user: {
        id: userId,
        telegram_id,
        username,
        first_name,
        last_name,
        photo_url,
      },
      session: {
        access_token: verifyData.session.access_token,
        refresh_token: verifyData.session.refresh_token,
        expires_in: verifyData.session.expires_in,
        token_type: verifyData.session.token_type ?? "bearer",
      },
    });
  } catch (err) {
    console.error("auth-telegram error:", err);
    return json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
});