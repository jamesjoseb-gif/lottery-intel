import test from "node:test";
import assert from "node:assert/strict";
import { buildNumberIntelligence, getActivityLabel, scoreHistoricalActivity } from "./number-intelligence.ts";

test("activity labels use documented score boundaries", () => {
  assert.deepEqual([0, 19, 20, 39, 40, 59, 60, 79, 80, 100].map(getActivityLabel), [
    "Very Low", "Very Low", "Low", "Low", "Moderate", "Moderate", "High", "High", "Very High", "Very High",
  ]);
});

test("score is bounded and its components explain the total", () => {
  const maximum = scoreHistoricalActivity({ frequencyComparedWithAverage: 99, daysSinceLastAppearance: 0, last12MonthsComparedWithAverage: 99, last24MonthsComparedWithAverage: 99 });
  assert.equal(maximum.value, 100);
  assert.deepEqual(maximum.components, { frequency: 40, recency: 30, recentActivity: 30 });
  assert.equal(maximum.value, Object.values(maximum.components).reduce((sum, value) => sum + value, 0));
  assert.equal(scoreHistoricalActivity({ frequencyComparedWithAverage: -1, daysSinceLastAppearance: null, last12MonthsComparedWithAverage: -1, last24MonthsComparedWithAverage: -1 }).value, 0);
});

test("builds gaps, prize, active years, recent windows, and trend", () => {
  const intelligence = buildNumberIntelligence([
    { draw_date: "2023-08-01", prize_type: "starter" },
    { draw_date: "2025-01-01", prize_type: "first" },
    { draw_date: "2026-01-01", prize_type: "first" },
    { draw_date: "2026-07-01", prize_type: "consolation" },
  ], { totalArchiveAppearances: 20_000, archiveAppearancesLast12Months: 10_000, archiveAppearancesLast24Months: 20_000, asOf: new Date("2026-08-01T00:00:00Z") });
  assert.equal(intelligence.totalAppearances, 4);
  assert.equal(intelligence.frequencyComparedWithAverage, 2);
  assert.equal(intelligence.daysSinceLastAppearance, 31);
  assert.deepEqual([intelligence.shortestGap, intelligence.longestGap, intelligence.averageGap], [181, 519, 355]);
  assert.deepEqual([intelligence.appearancesLast12Months, intelligence.appearancesLast24Months], [2, 3]);
  assert.equal(intelligence.mostCommonPrizeType, "first");
  assert.deepEqual(intelligence.activeYears, [2023, 2025, 2026]);
  assert.equal(intelligence.recentTrend, "Increasing");
});

test("empty and single-appearance histories return safe nulls", () => {
  const context = { totalArchiveAppearances: 0, archiveAppearancesLast12Months: 0, archiveAppearancesLast24Months: 0, asOf: new Date("2026-08-01T00:00:00Z") };
  const empty = buildNumberIntelligence([], context);
  assert.equal(empty.daysSinceLastAppearance, null);
  assert.equal(empty.averageGap, null);
  assert.equal(empty.mostCommonPrizeType, null);
  assert.equal(empty.recentTrend, "No recent activity");
  const single = buildNumberIntelligence([{ draw_date: "2026-07-01", prize_type: "second" }], context);
  assert.equal(single.shortestGap, null);
  assert.equal(single.mostCommonPrizeType, "second");
});
