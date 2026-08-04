import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRankingPeriod, normalizeRankingTab, rankFourDNumbers, type FourDRankingAggregate } from "./fourd-rankings.ts";

const row = (number: string, period: number, gap: number, ratio: number): FourDRankingAggregate => ({
  winning_number: number, total_appearances: period + 10, appearances_30_days: period,
  appearances_90_days: period, appearances_365_days: period, appearances_12_months: period,
  appearances_24_months: period + 1, archive_total_appearances: 71_000,
  archive_12_months_appearances: 1_000, archive_24_months_appearances: 2_000,
  last_appearance: `2026-07-${String(31 - gap).padStart(2, "0")}`,
  average_historical_gap: 20, current_gap: gap, current_gap_to_average_ratio: ratio,
  most_common_prize_type: "starter",
});

test("normalizes URL ranking parameters", () => {
  assert.equal(normalizeRankingTab("overdue"), "overdue");
  assert.equal(normalizeRankingTab("unknown"), "hot");
  assert.equal(normalizeRankingPeriod("30"), "30");
  assert.equal(normalizeRankingPeriod("weekly"), "365");
});

test("ranks one aggregate response without refetching raw appearances", () => {
  const rows = [row("0007", 2, 3, .15), row("1234", 5, 10, .5), row("9999", 0, 20, 4)];
  assert.deepEqual(rankFourDNumbers(rows, "hot", "30").map((item) => item.winning_number), ["1234", "0007", "9999"]);
  assert.deepEqual(rankFourDNumbers(rows, "cold", "30").map((item) => item.winning_number), ["9999", "0007", "1234"]);
  assert.equal(rankFourDNumbers(rows, "overdue", "all")[0].winning_number, "9999");
  assert.equal(rankFourDNumbers(rows, "recent", "365")[0].winning_number, "0007");
  assert.equal(rows[0].winning_number, "0007", "leading zeroes remain intact");
});
