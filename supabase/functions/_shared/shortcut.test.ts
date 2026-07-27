import { describe, expect, test } from "bun:test";
import {
  buildTransactionSchema,
  canonicalizeShortcutRequestId,
  createMockParse,
  escapeTelegramHtml,
  generateShortcutToken,
  hmacToken,
  normalizeParsedTransactionDate,
  readBearerToken,
  readShortcutBodyToken,
  userTextMentionsDateOrTime,
  validateParsedTransaction,
  validateShortcutBody,
  type CategoryOption,
  type SubcategoryOption,
} from "./shortcut";

const categories: CategoryOption[] = [
  { key: "cat_0", id: "expense-id", name: "Еда", type: "expense" },
  { key: "cat_1", id: "income-id", name: "Зарплата", type: "income" },
];
const subcategories: SubcategoryOption[] = [
  { key: "sub_0", id: "coffee-id", category_id: "expense-id", name: "Кофе" },
  { key: "sub_1", id: "bonus-id", category_id: "income-id", name: "Бонус" },
];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DETERMINISTIC_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("validateShortcutBody", () => {
  test("normalizes a valid request", () => {
    const result = validateShortcutBody({
      text: "  Кофе 350  ",
      request_id: "123e4567-e89b-42d3-a456-426614174000",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.text).toBe("Кофе 350");
  });

  test("accepts a Shortcut-friendly request idempotency key", () => {
    const first = validateShortcutBody({
      text: "Кофе 350",
      request_id: "2026-07-20T15:58:03-482913",
    });
    const second = validateShortcutBody({
      text: "Кофе 350",
      request_id: "2026-07-20T15:58:03-482913",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.value.request_id).toBe(second.value.request_id);
      expect(first.value.request_id).toMatch(DETERMINISTIC_UUID_PATTERN);
    }
  });

  test("accepts numeric request ids from Apple Shortcuts JSON", () => {
    const result = validateShortcutBody({
      text: "Кофе 350",
      request_id: 582_913_407_122,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.request_id).toMatch(DETERMINISTIC_UUID_PATTERN);
    }
  });

  test("normalizes localized or multiline request ids from Apple Shortcuts", () => {
    const first = validateShortcutBody({
      text: "Кофе 350",
      request_id: "20 июл. 2026 г.\n-\n582 913",
    });
    const second = validateShortcutBody({
      text: "Кофе 350",
      request_id: "20июл.2026г.-582913",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.value.request_id).toBe(second.value.request_id);
    }
  });

  test("generates a fresh request id when Apple Shortcut sends auto", () => {
    const first = validateShortcutBody({
      text: "Кофе 350",
      request_id: "auto",
    });
    const second = validateShortcutBody({
      text: "Кофе 350",
      request_id: "auto",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.value.request_id).toMatch(UUID_PATTERN);
      expect(second.value.request_id).toMatch(UUID_PATTERN);
      expect(first.value.request_id).not.toBe(second.value.request_id);
    }
  });

  test("rejects missing text and invalid request id", () => {
    expect(validateShortcutBody({ text: "", request_id: "bad" }).ok).toBe(false);
    expect(validateShortcutBody({ text: "Кофе 350", request_id: "" }).ok).toBe(false);
  });
});

test("canonical request ids preserve UUIDs and normalize Shortcut keys", () => {
  expect(canonicalizeShortcutRequestId("123E4567-E89B-42D3-A456-426614174000")).toBe(
    "123e4567-e89b-42d3-a456-426614174000"
  );
  expect(canonicalizeShortcutRequestId("2026-07-20T15:58:03-482913")).toBe(
    canonicalizeShortcutRequestId("2026-07-20T15:58:03-482913")
  );
  expect(canonicalizeShortcutRequestId("no")).toMatch(DETERMINISTIC_UUID_PATTERN);
});

describe("token security", () => {
  test("accepts only scoped bearer tokens", () => {
    const token = `wsp_sk_${"a".repeat(43)}`;
    expect(readBearerToken(`Bearer ${token}`)).toBe(token);
    expect(readBearerToken("Bearer wsp_sk_too_short")).toBeNull();
    expect(readBearerToken("Bearer other_secret")).toBeNull();
    expect(readBearerToken(null)).toBeNull();
  });

  test("accepts scoped tokens from Shortcut JSON body", () => {
    const token = `wsp_sk_${"a".repeat(43)}`;
    expect(readShortcutBodyToken({ shortcut_token: ` ${token} ` })).toBe(token);
    expect(readShortcutBodyToken({ shortcut_token: "wsp_sk_too_short" })).toBeNull();
    expect(readShortcutBodyToken({ shortcut_token: "other_secret" })).toBeNull();
    expect(readShortcutBodyToken({ token })).toBeNull();
    expect(readShortcutBodyToken(null)).toBeNull();
  });

  test("HMAC is deterministic and peppered", async () => {
    const first = await hmacToken("wsp_sk_secret", "pepper-a");
    expect(first).toHaveLength(64);
    expect(await hmacToken("wsp_sk_secret", "pepper-a")).toBe(first);
    expect(await hmacToken("wsp_sk_secret", "pepper-b")).not.toBe(first);
  });

  test("generates a scoped 256-bit credential", () => {
    const first = generateShortcutToken();
    const second = generateShortcutToken();
    expect(first).toMatch(/^wsp_sk_[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
  });
});

test("schema exposes opaque category keys, not database ids", () => {
  const schema = buildTransactionSchema(categories, subcategories, ["RUB", "USD"]);
  const serialized = JSON.stringify(schema);
  expect(serialized).toContain("cat_0");
  expect(serialized).toContain("sub_0");
  expect(serialized).not.toContain("expense-id");
  expect(serialized).not.toContain("coffee-id");
  const direction = (
    schema as { properties: { direction: { enum: string[] } } }
  ).properties.direction;
  expect(direction.enum).toEqual(["expense"]);
});

test("semantic validation rejects income", () => {
  const error = validateParsedTransaction(
    {
      valid: true,
      direction: "income",
      amount: 350,
      currency: "RUB",
      category_key: "cat_0",
      subcategory_key: null,
      occurred_at: new Date().toISOString(),
      note: "Кофе",
      confidence: 0.9,
      clarification: null,
    },
    categories,
    subcategories,
    ["RUB"]
  );
  expect(error).toBe("income_not_supported");
});

test("semantic validation rejects a subcategory from another category", () => {
  const error = validateParsedTransaction(
    {
      valid: true,
      direction: "expense",
      amount: 350,
      currency: "RUB",
      category_key: "cat_0",
      subcategory_key: "sub_1",
      occurred_at: new Date().toISOString(),
      note: "Кофе",
      confidence: 0.9,
      clarification: null,
    },
    categories,
    subcategories,
    ["RUB"]
  );
  expect(error).toBe("invalid_subcategory");
});

test("semantic validation rejects malformed provider output", () => {
  const error = validateParsedTransaction(
    {
      valid: true,
      direction: "expense",
      amount: 350,
      currency: "RUB",
      category_key: "cat_0",
      subcategory_key: null,
      occurred_at: new Date().toISOString(),
      note: null as unknown as string,
      confidence: 0.9,
      clarification: null,
    },
    categories,
    subcategories,
    ["RUB"]
  );
  expect(error).toBe("invalid_note");
});

test("semantic validation rejects amounts outside the database range", () => {
  const error = validateParsedTransaction(
    {
      valid: true,
      direction: "expense",
      amount: 1_000_000_000_000,
      currency: "RUB",
      category_key: "cat_0",
      subcategory_key: null,
      occurred_at: new Date().toISOString(),
      note: "Ошибка модели",
      confidence: 0.9,
      clarification: null,
    },
    categories,
    subcategories,
    ["RUB"]
  );
  expect(error).toBe("invalid_amount");
});

test("date normalization defaults missing dates only when user did not mention time", () => {
  const now = new Date("2026-07-09T07:45:00.000Z");
  const base = {
    valid: true,
    direction: "expense" as const,
    amount: 350,
    currency: "RUB",
    category_key: "cat_0",
    subcategory_key: null,
    occurred_at: "сегодня",
    note: "Кофе",
    confidence: 0.9,
    clarification: null,
  };

  expect(userTextMentionsDateOrTime("Кофе 350 рублей")).toBe(false);
  expect(userTextMentionsDateOrTime("Вчера кофе 350 рублей")).toBe(true);
  expect(
    normalizeParsedTransactionDate({
      parsed: base,
      userText: "Кофе 350 рублей",
      now,
    }).occurred_at
  ).toBe(now.toISOString());
  expect(
    normalizeParsedTransactionDate({
      parsed: base,
      userText: "Вчера кофе 350 рублей",
      now,
    }).occurred_at
  ).toBe("сегодня");
});

test("mock parser supports development without external API calls", () => {
  const parsed = createMockParse({
    text: "Еда 1 250 рублей",
    now: new Date("2026-07-08T10:00:00.000Z"),
    defaultCurrency: "RUB",
    categories,
    subcategories,
  });
  expect(parsed.valid).toBe(true);
  expect(parsed.amount).toBe(1250);
  expect(parsed.category_key).toBe("cat_0");
  expect(parsed.subcategory_key).toBeNull();
});

test("mock parser explains that Shortcut accepts expenses only", () => {
  const parsed = createMockParse({
    text: "Получил зарплату 100000 рублей",
    now: new Date("2026-07-08T10:00:00.000Z"),
    defaultCurrency: "RUB",
    categories,
    subcategories,
  });
  expect(parsed.valid).toBe(false);
  expect(parsed.direction).toBe("expense");
  expect(parsed.clarification).toBe("Shortcut добавляет только расходы");
});

test("Telegram HTML escaping prevents markup injection", () => {
  expect(escapeTelegramHtml("<b>A&B</b>")).toBe("&lt;b&gt;A&amp;B&lt;/b&gt;");
});
