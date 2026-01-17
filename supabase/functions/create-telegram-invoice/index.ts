// @ts-expect-error: Deno.serve is provided by the Deno runtime
Deno.serve(async (req)=>{
  try {
    const { amount, title, payload } = await req.json();
    // @ts-expect-error: Deno.serve is provided by the Deno runtime
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!BOT_TOKEN) return new Response(JSON.stringify({
      error: 'Missing BOT_TOKEN'
    }), {
      status: 500
    });
    if (!amount || !title || !payload) return new Response(JSON.stringify({
      error: 'Missing parameters'
    }), {
      status: 400
    });
    const body = {
      title: title,
      description: title,
      payload: payload,
      provider_token: '',
      currency: 'XTR',
      prices: [
        {
          label: title,
          amount: Math.round(Number(amount))
        }
      ]
    };
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500
    });
  }
});
