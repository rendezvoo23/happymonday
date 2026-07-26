// Donations are intentionally disabled until they have their own server-side
// order ledger and successful_payment fulfillment flow.

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "content-type, apikey, x-client-info, authorization",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

Deno.serve((request: Request): Response => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  return new Response(
    JSON.stringify({ error: "Donations are temporarily unavailable" }),
    {
      status: 410,
      headers: {
        ...corsHeaders(request),
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
});
