import assert from "node:assert/strict";
import test from "node:test";
import { buildFourDRankings, normalizeRankingPeriod, type RankingAppearance } from "./fourd-rankings.ts";

const row = (winning_number: string, draw_date: string, prize_type: RankingAppearance["prize_type"] = "starter"): RankingAppearance => ({ winning_number, draw_date, prize_type });
const asOf = new Date("2026-08-01T00:00:00Z");

test("period filtering supports 30, 90, 365 days and all history", () => {
  const rows = [row("0001", "2026-07-20"), row("0001", "2026-06-01"), row("0001", "2025-10-01"), row("0001", "2020-01-01")];
  assert.equal(buildFourDRankings(rows, "30", { asOf }).hot[0].periodAppearances, 1);
  assert.equal(buildFourDRankings(rows, "90", { asOf }).hot[0].periodAppearances, 2);
  assert.equal(buildFourDRankings(rows, "365", { asOf }).hot[0].periodAppearances, 3);
  assert.equal(buildFourDRankings(rows, "all", { asOf }).hot[0].periodAppearances, 4);
  assert.equal(normalizeRankingPeriod("bad"), "90");
});

test("leading zeroes are preserved and invalid numbers are excluded", () => {
  const result = buildFourDRankings([row("0007", "2026-07-01"), row("7", "2026-07-02")], "90", { asOf });
  assert.equal(result.hot[0].number, "0007");
  assert.equal(result.hot.length, 1);
});

test("hot ranking prioritises frequency and recency", () => {
  const rows = [row("1000", "2026-07-31"), row("1000", "2026-07-20"), row("1000", "2026-07-10"), row("2000", "2026-05-10"), row("2000", "2020-01-01")];
  assert.deepEqual(buildFourDRankings(rows, "90", { asOf }).hot.map((item) => item.number), ["1000", "2000"]);
});

test("cold order uses low period activity then long absence", () => {
  const rows = [row("1000", "2020-01-01"), row("1000", "2021-01-01"), row("2000", "2020-01-01"), row("2000", "2024-01-01"), row("3000", "2026-07-01"), row("3000", "2026-07-20")];
  assert.deepEqual(buildFourDRankings(rows, "90", { asOf }).cold.map((item) => item.number), ["1000", "2000", "3000"]);
});

test("overdue compares current gap with each number's mean gap", () => {
  const rows = [row("1111", "2025-01-01"), row("1111", "2025-02-01"), row("2222", "2024-01-01"), row("2222", "2025-01-01")];
  const overdue = buildFourDRankings(rows, "all", { asOf }).overdue;
  assert.equal(overdue[0].number, "1111");
  assert.ok(overdue[0].currentGapVersusAverage! > overdue[1].currentGapVersusAverage!);
});

test("recent winners sort newest first", () => {
  const rows = [row("1111", "2026-01-01"), row("2222", "2026-07-31"), row("3333", "2026-06-01")];
  assert.deepEqual(buildFourDRankings(rows, "all", { asOf }).recent.map((item) => item.number), ["2222", "3333", "1111"]);
});

test("stable ties use exact number ascending", () => {
  const rows = [row("0002", "2026-07-01"), row("0001", "2026-07-01")];
  const result = buildFourDRankings(rows, "90", { asOf });
  assert.deepEqual(result.hot.map((item) => item.number), ["0001", "0002"]);
  assert.deepEqual(result.recent.map((item) => item.number), ["0001", "0002"]);
});

test("cold and overdue exclude insufficient one-appearance history", () => {
  const rows = [row("0001", "2020-01-01"), row("0002", "2020-01-01"), row("0002", "2021-01-01")];
  const result = buildFourDRankings(rows, "all", { asOf });
  assert.equal(result.cold.some((item) => item.number === "0001"), false);
  assert.equal(result.overdue.some((item) => item.number === "0001"), false);
});

test("empty archives return empty rankings", () => {
  assert.deepEqual(buildFourDRankings([], "90", { asOf }), { hot: [], cold: [], overdue: [], recent: [] });
});

test("activity scores stay within 0 to 100 and results cap at 50", () => {
  const rows = Array.from({ length: 75 }, (_, index) => row(String(index).padStart(4, "0"), "2026-07-31", "first"));
  const result = buildFourDRankings(rows, "90", { asOf, limit: 999 });
  assert.equal(result.hot.length, 50);
  assert.ok(result.hot.every((item) => item.historicalActivityScore >= 0 && item.historicalActivityScore <= 100));
});

test("most common prize uses deterministic prize priority for ties", () => {
  const result = buildFourDRankings([row("1234", "2026-01-01", "starter"), row("1234", "2026-02-01", "first")], "all", { asOf });
  assert.equal(result.hot[0].mostCommonPrizeType, "first");
});
