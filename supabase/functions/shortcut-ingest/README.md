# WhySpent Apple Shortcut — text ingestion

This feature is server-first. The Shortcut never receives a Telegram bot token,
Supabase service-role key, or Groq key. It stores only a revocable credential
whose scope is limited to creating a transaction.

## Data sent to Groq

Only the minimum needed for parsing is sent:

- the text entered by the user;
- current time, locale, and timezone;
- default currency and active currency codes;
- category display names mapped to opaque keys such as `cat_0`.

Telegram IDs, Supabase user/category UUIDs, API credentials, transaction history,
and the user's profile are not sent. The raw input is not persisted in Shortcut
operational tables and is not written to function logs.

Enable Zero Data Retention in the Groq organization before switching from mock
mode to Groq mode.

## Required secrets

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are supplied
by Supabase Edge Runtime. Configure these project secrets separately:

```text
GROQ_API_KEY=<Groq project key>
SHORTCUT_TOKEN_PEPPER=<at least 32 cryptographically random bytes>
TELEGRAM_BOT_TOKEN=<existing WhySpent bot token>
TELEGRAM_WEBHOOK_SECRET=<random Telegram webhook secret>
SHORTCUT_AI_MODE=mock
SHORTCUT_ALLOWED_ORIGINS=https://your-mini-app.example
```

Keep `SHORTCUT_AI_MODE=mock` for the first end-to-end test. Switch it to `groq`
only after Groq ZDR is enabled and `dry_run` succeeds.

Do not rotate `SHORTCUT_TOKEN_PEPPER` casually: doing so invalidates all issued
Shortcut tokens. Tokens can instead be revoked through `shortcut-token`.

## Safe deployment order

No production command should be run before a database backup is available.

1. Review the pending migration list.
2. Run a migration dry-run against the linked project.
3. Confirm that only `shortcut_access_tokens`, `shortcut_ingestion_requests`,
   and `create_shortcut_transaction` will be added.
4. Apply the migration.
5. Verify that `anon` and `authenticated` cannot access either new table.
6. Configure secrets with `SHORTCUT_AI_MODE=mock`.
7. Deploy `shortcut-token` with JWT verification enabled.
8. Before deploying `telegram-webhook`, configure `TELEGRAM_WEBHOOK_SECRET`,
   deploy the function, then immediately register the same value through
   Telegram `setWebhook` as `secret_token`. If that sequence cannot be completed,
   do not deploy the webhook change.
9. Deploy `shortcut-ingest` with JWT verification disabled; it validates its own
   scoped bearer credential.
10. Send `/shortcut` to the bot in a private chat to issue a token. Sending it
    again revokes the previous token; `/shortcut_revoke` revokes all active ones.
11. Test `shortcut-ingest` with `dry_run: true`.
12. Test one real transaction in mock mode and delete it manually.
13. Enable Groq mode and repeat dry-run tests before allowing real inserts.

## Request contract

`POST /functions/v1/shortcut-ingest`

```text
Authorization: Bearer wsp_sk_<credential>
Content-Type: application/json
```

```json
{
  "text": "Вчера потратил 1250 рублей на ужин",
  "request_id": "a new UUID for every Shortcut run",
  "timezone": "Europe/Moscow",
  "locale": "ru-RU",
  "dry_run": true
}
```

`request_id` makes retries idempotent. Never reuse a fixed UUID in the Shortcut.

## Building the iPhone Shortcut

1. Add **Ask for Input** with input type **Text**.
2. Add **Generate UUID**.
3. Add a **Dictionary** containing:
   - `text`: Ask for Input result;
   - `request_id`: generated UUID;
   - `timezone`: `Europe/Moscow`;
   - `locale`: `ru-RU`;
   - `dry_run`: Boolean `true` for initial testing.
4. Add **Get Contents of URL**:
   - URL: `https://<project-ref>.supabase.co/functions/v1/shortcut-ingest`;
   - method: `POST`;
   - request body: JSON using the Dictionary;
   - header `Authorization`: `Bearer <issued Shortcut token>`.
5. Add **Show Result** using the response from Get Contents of URL.

Do not publish or share an iCloud Shortcut link after embedding a real token.
Revoke and reissue the token if the Shortcut or screenshots expose it.

## Test matrix

Start with `dry_run: true` and a fresh UUID for every request:

```text
Кофе 350
Вчера продукты 2 400 рублей
Такси 840
Получил зарплату 150000
Обед 12 евро
Потратил деньги
Купил телефон
Кофе 300 и такси 500
Привет, как дела?
```

Verify invalid token (`401`), repeated UUID (idempotent response), empty input
(`400`), more than 15 requests per minute (`429`), unavailable AI (`503`), and
that `dry_run` creates neither a transaction nor a Telegram notification.

## Local checks

The pure validation and security helpers do not need external services:

```bash
bun test supabase/functions/_shared/shortcut.test.ts
bun run typecheck
bun run build
```

The full migration and Edge runtime test requires a running local Supabase stack
through Docker. Never replace that test by experimenting directly on production.
