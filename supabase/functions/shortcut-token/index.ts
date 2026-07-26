// Issues or revokes a scoped Apple Shortcut credential for an authenticated user.
// Required secret: SHORTCUT_TOKEN_PEPPER.
// This function should keep the default Supabase JWT verification enabled.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";
import { generateShortcutToken, hmacToken } from "../_shared/shortcut.ts";

function env(name: string): string | null {
  return Deno.env.get(name) ?? null;
}

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const configured = (env("SHORTCUT_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return configured.includes(origin) ? origin : null;
}

function json(request: Request, body: unknown, status = 200): Response {
  const origin = allowedOrigin(request);
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(origin
        ? {
            "Access-Control-Allow-Origin": origin,
            Vary: "Origin",
          }
        : {}),
    },
  });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    const origin = allowedOrigin(request);
    if (!origin) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      },
    });
  }
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return json(request, { error: "Unauthorized" }, 401);

  const supabaseUrl = env("SUPABASE_URL");
  const anonKey = env("SUPABASE_ANON_KEY");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const tokenPepper = env("SHORTCUT_TOKEN_PEPPER");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !tokenPepper) {
    return json(request, { error: "Server misconfiguration" }, 500);
  }

  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON" }, 400);
  }
  const action = body.action === "revoke" ? "revoke" : body.action === "create" ? "create" : null;
  if (!action) return json(request, { error: "Unsupported action" }, 400);

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const accessToken = authorization.slice("Bearer ".length);
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData.user) return json(request, { error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    if (action === "revoke") {
      const { error: revokeError } = await admin.rpc("revoke_shortcut_access_tokens", {
        p_user_id: userData.user.id,
      });
      if (revokeError) return json(request, { error: "Unable to update token" }, 500);
      return json(request, { ok: true, revoked: true });
    }

    const plaintextToken = generateShortcutToken();
    const tokenHash = await hmacToken(plaintextToken, tokenPepper);
    const { data: createdTokenId, error: insertError } = await admin.rpc(
      "rotate_shortcut_access_token",
      {
        p_user_id: userData.user.id,
        p_token_hash: tokenHash,
        p_label: "Apple Shortcut",
      }
    );
    if (insertError || !createdTokenId) {
      return json(request, { error: "Unable to create token" }, 500);
    }

    // This is the only response that ever contains the plaintext credential.
    return json(request, { ok: true, token: plaintextToken });
  } catch {
    return json(request, { error: "Internal server error" }, 500);
  }
});
