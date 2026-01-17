// Telegram Webhook Edge Function for Supabase (Deno)
// Handles updates including pre_checkout_query to confirm invoice payments.
// @ts-expect-error: Deno.serve is provided by the Deno runtime
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN'); 
if (!TELEGRAM_BOT_TOKEN) {
  console.error('[WEBHOOK] ERROR: TELEGRAM_BOT_TOKEN not set');
}

console.log('[WEBHOOK] Telegram webhook function initialized');
async function replyOk(body) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
// Confirm pre_checkout_query by answering via Telegram API
async function answerPreCheckout(pre_checkout_query_id, ok = true, error_message?: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`;
  const payload: {
    pre_checkout_query_id: string;
    ok: boolean;
    error_message?: string;
  } = {
    pre_checkout_query_id,
    ok
  };
  
  if (!ok && error_message) {
    payload.error_message = error_message;
  }
  
  console.log('[WEBHOOK] Calling answerPreCheckoutQuery', {
    pre_checkout_query_id,
    ok,
    error_message: error_message || 'none'
  });
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const responseData = await res.json();
    
    console.log('[WEBHOOK] answerPreCheckoutQuery response', {
      status: res.status,
      ok: res.ok,
      data: responseData
    });
    
    if (!res.ok || !responseData.ok) {
      console.error('[WEBHOOK] ERROR: answerPreCheckoutQuery failed', {
        status: res.status,
        description: responseData.description,
        error_code: responseData.error_code
      });
    }
    
    return { success: res.ok && responseData.ok, response: responseData };
  } catch (err) {
    console.error('[WEBHOOK] ERROR: answerPreCheckoutQuery exception', err);
    throw err;
  }
}
function setCorsHeaders(headers) {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
}
// @ts-expect-error: Deno.serve is provided by the Deno runtime
Deno.serve(async (req)=>{
  const url = new URL(req.url);
  // Allow preflight
  if (req.method === 'OPTIONS') {
    const headers = new Headers();
    setCorsHeaders(headers);
    return new Response(null, {
      status: 204,
      headers
    });
  }
  const headers = new Headers();
  setCorsHeaders(headers);
  if (req.method !== 'POST') return new Response('Method Not Allowed', {
    status: 405,
    headers
  });
  let update;
  try {
    update = await req.json();
    console.log('[WEBHOOK] Received update', {
      updateId: update.update_id,
      hasPreCheckout: !!update.pre_checkout_query,
      hasMessage: !!update.message,
      hasSuccessfulPayment: !!update.message?.successful_payment
    });
  } catch (e) {
    console.error('[WEBHOOK] ERROR: Failed to parse request body', e);
    return new Response('Bad Request', {
      status: 400,
      headers
    });
  }
  // Handle pre_checkout_query
  if (update.pre_checkout_query) {
    const pq = update.pre_checkout_query;
    
    console.log('[WEBHOOK] Processing pre_checkout_query', {
      id: pq.id,
      from: pq.from,
      currency: pq.currency,
      total_amount: pq.total_amount,
      invoice_payload: pq.invoice_payload
    });
    
    // TODO: validate amount, invoice payload, or check your DB records
    // For now we always confirm if token exists
    if (!TELEGRAM_BOT_TOKEN) {
      console.error('[WEBHOOK] ERROR: TELEGRAM_BOT_TOKEN not configured, rejecting payment');
      await answerPreCheckout(pq.id, false, 'Server misconfiguration');
      return new Response('TELEGRAM_BOT_TOKEN not configured', {
        status: 500,
        headers
      });
    }
    
    try {
      const result = await answerPreCheckout(pq.id, true);
      
      if (!result.success) {
        console.error('[WEBHOOK] ERROR: Failed to answer pre_checkout_query', result.response);
        return new Response('Failed to confirm payment', {
          status: 500,
          headers
        });
      }
      
      console.log('[WEBHOOK] Successfully answered pre_checkout_query');
      return new Response('pre_checkout_query answered', {
        status: 200,
        headers
      });
    } catch (err) {
      console.error('[WEBHOOK] ERROR: Exception while answering pre_checkout_query', err);
      return new Response('Internal Server Error', {
        status: 500,
        headers
      });
    }
  }
  // Handle normal messages or successful payments
  if (update.message) {
    // Example: handle successful_payment
    if (update.message.successful_payment) {
      const payment = update.message.successful_payment;
      
      console.log('[WEBHOOK] Successful payment received', {
        currency: payment.currency,
        total_amount: payment.total_amount,
        invoice_payload: payment.invoice_payload,
        telegram_payment_charge_id: payment.telegram_payment_charge_id,
        provider_payment_charge_id: payment.provider_payment_charge_id,
        from: update.message.from
      });
      
      // process payment: save to DB, notify user, etc.
      // Use background task
      const task = (async ()=>{
        // Implement your DB calls or notifications here
        console.log('[WEBHOOK] Processing payment in background');
        // TODO: Add database calls to record the payment
      })();
      // run in background
      // @ts-ignore
      globalThis.EdgeRuntime?.waitUntil?.(task);
      
      console.log('[WEBHOOK] Payment acknowledged');
      return new Response('ok', {
        status: 200,
        headers
      });
    }
    // Echo message or ignore
    console.log('[WEBHOOK] Received message (no action)', {
      messageId: update.message.message_id,
      from: update.message.from
    });
    return new Response('ok', {
      status: 200,
      headers
    });
  }
  console.log('[WEBHOOK] No handler for update type', {
    updateId: update.update_id,
    keys: Object.keys(update)
  });
  
  return new Response('No handler for update', {
    status: 200,
    headers
  });
});
