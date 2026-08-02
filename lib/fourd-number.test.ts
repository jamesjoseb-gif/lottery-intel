import test from "node:test";
import assert from "node:assert/strict";
import { adjacentFourDNumbers, buildNumberHistoryStats, normalizeFourDNumber, relatedFourDNumbers, sanitizeFourDInput } from "./fourd-number.ts";

test("normalizes one to four digits and preserves leading zeroes", () => {
  assert.equal(normalizeFourDNumber("7"), "0007");
  assert.equal(normalizeFourDNumber("042"), "0042");
  assert.equal(normalizeFourDNumber("0012"), "0012");
  assert.equal(normalizeFourDNumber("12-3"), "0123");
});

test("does not turn empty or invalid input into a number", () => {
  assert.equal(normalizeFourDNumber(""), null);
  assert.equal(normalizeFourDNumber("hello"), null);
  assert.equal(normalizeFourDNumber("12345"), null);
});

test("sanitizes typing to no more than four digits", () => {
  assert.equal(sanitizeFourDInput("a01-2345"), "0123");
});

test("calculates history summaries, gaps, and breakdowns", () => {
  const stats = buildNumberHistoryStats([
    { draw_date: "2024-01-01", prize_type: "first" },
    { draw_date: "2024-01-11", prize_type: "starter" },
    { draw_date: "2025-02-10", prize_type: "first" },
  ], new Date("2025-02-20T00:00:00Z"));
  assert.equal(stats.total, 3);
  assert.deepEqual(stats.gaps, { average: 203, shortest: 10, longest: 396 });
  assert.equal(stats.daysSinceLast, 10);
  assert.deepEqual(stats.prizes, { first: 2, second: 0, third: 0, starter: 1, consolation: 0 });
  assert.deepEqual(stats.years, [["2025", 1], ["2024", 2]]);
  assert.deepEqual(stats.weekdays, [["Monday", 2], ["Thursday", 1]]);
});

test("builds leading-zero-safe adjacent and related navigation", () => {
  assert.deepEqual(adjacentFourDNumbers("0000"), { previous: "9999", next: "0001" });
  assert.deepEqual(adjacentFourDNumbers("9999"), { previous: "9998", next: "0000" });
  assert.ok(relatedFourDNumbers("0012").includes("2100"));
  assert.ok(relatedFourDNumbers("0012").every((number) => number.length === 4));
});

import { summarizeFourDDraws, type DrawRow } from "./homepage-data.ts";

test("summarizes top prizes and uses safe nulls for incomplete published rows", () => {
  const base = { draw_id: "draw-1", draw_no: "42", draw_date: "2026-01-01", published_at: "2026-01-01T00:00:00Z" };
  const rows = [
    { ...base, prize_type: "first", winning_number: "0012" },
    { ...base, prize_type: "third", winning_number: "8888" },
  ] as DrawRow[];
  assert.deepEqual(summarizeFourDDraws(rows), [{ ...base, first: "0012", second: null, third: "8888" }]);
  assert.deepEqual(summarizeFourDDraws([]), []);
});
