import { describe, expect, test } from "bun:test";
import { getWeekIsoRange } from "../src/lib/dateRanges";

describe("getWeekIsoRange", () => {
  test("returns the whole Monday-Sunday week across a month boundary", () => {
    // 1 May 2026 is Friday. Its calendar week starts in April.
    const { fromISO, toISO } = getWeekIsoRange(new Date(2026, 4, 1, 12));
    const from = new Date(fromISO);
    const to = new Date(toISO);

    expect(from.getDay()).toBe(1);
    expect(from.getMonth()).toBe(3);
    expect(to.getDay()).toBe(1);
    expect(to.getMonth()).toBe(4);
    expect(to.getTime() - from.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
