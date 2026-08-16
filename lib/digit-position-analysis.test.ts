import test from "node:test";
import assert from "node:assert/strict";
import { buildDigitPositionAnalysis } from "./digit-position-analysis.ts";

test("returns one insight per digit and preserves leading zeroes", () => {
  const rows = [
    { winning_number: "0123", draw_date: "2026-07-01" },
    { winning_number: "0456", draw_date: "2026-06-01" },
    { winning_number: "9123", draw_date: "2025-01-01" },
  ];
  const result = buildDigitPositionAnalysis("0123", rows, { asOf: new Date("2026-08-01T00:00:00Z") });
  assert.equal(result.length, 4);
  assert.equal(result[0].digit, "0");
  assert.equal(result[0].totalCount, 2);
  assert.equal(result[0].recentCount, 2);
  assert.equal(result[1].digit, "1");
});

test("compares frequency with the neutral ten-percent baseline", () => {
  const rows = Array.from({ length: 10 }, (_, index) => ({
    winning_number: index < 2 ? "6000" : "1000",
    draw_date: "2026-07-01",
  }));
  const [first] = buildDigitPositionAnalysis("6000", rows, { asOf: new Date("2026-08-01T00:00:00Z") });
  assert.equal(first.totalRate, 0.2);
  assert.equal(first.historicalIndex, 2);
  assert.equal(first.recentIndex, 2);
});

test("handles invalid numbers and empty archives safely", () => {
  assert.deepEqual(buildDigitPositionAnalysis("123", []), []);
  const result = buildDigitPositionAnalysis("0000", []);
  assert.equal(result.length, 4);
  assert.ok(result.every((item) => item.totalRate === 0 && item.recentRate === 0));
});
