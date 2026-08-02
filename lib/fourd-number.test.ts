import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFourDNumber, sanitizeFourDInput } from "./fourd-number.ts";

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
