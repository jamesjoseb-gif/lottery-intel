import assert from "node:assert/strict";
import test from "node:test";
import { numberMatches, parseLuckySearch, runLuckyQuery, sortLuckyResults, type LuckyNumberResult } from "./lucky-number-finder.ts";

const item = (winning_number: string, score = 50, appearances = 2, last = "2026-01-01", absent = 10): LuckyNumberResult => ({
  winning_number, historical_activity_score: score, activity_label: "Moderate", total_appearances: appearances,
  last_appearance: last, days_since_last_appearance: absent, average_gap: 20, most_common_prize: "starter",
  appearances_last_12_months: 1, appearances_last_24_months: 2,
});

test("accepts one, two, three and four-digit ordered input", () => {
  for (const digits of ["1", "18", "018", "0018"]) assert.equal(parseLuckySearch({ digits }).valid, true);
  assert.equal(numberMatches("9018", "1", "ordered"), true);
  assert.equal(numberMatches("1818", "18", "ordered"), true);
  assert.equal(numberMatches("0018", "018", "ordered"), true);
  assert.equal(numberMatches("0018", "0018", "ordered"), true);
});

test("ordered digits need not be consecutive and preserve their order", () => {
  assert.equal(numberMatches("1082", "18", "ordered"), true);
  assert.equal(numberMatches("8012", "18", "ordered"), false);
});

test("consecutive mode requires a substring", () => {
  assert.equal(numberMatches("0188", "18", "consecutive"), true);
  assert.equal(numberMatches("1082", "18", "consecutive"), false);
});

test("leading zeroes remain meaningful", () => {
  assert.equal(numberMatches("0018", "001", "ordered"), true);
  assert.equal(parseLuckySearch({ digits: "001" }).digits, "001");
});

test("deduplicates and caps results at 100", () => {
  const rows = [item("0000"), item("0000"), ...Array.from({ length: 120 }, (_, i) => item(String(i + 1).padStart(4, "0")))];
  const result = sortLuckyResults(rows, "number", 999);
  assert.equal(result.length, 100);
  assert.equal(new Set(result.map((row) => row.winning_number)).size, 100);
});

test("all sorting options have stable number tie-breaks", () => {
  const rows = [item("0002", 60, 4, "2025-01-01", 20), item("0001", 60, 4, "2026-01-01", 50), item("0003", 80, 2, "2024-01-01", 100)];
  assert.deepEqual(sortLuckyResults(rows, "score").map(x => x.winning_number), ["0003", "0001", "0002"]);
  assert.deepEqual(sortLuckyResults(rows, "appearances").map(x => x.winning_number), ["0001", "0002", "0003"]);
  assert.deepEqual(sortLuckyResults(rows, "recent").map(x => x.winning_number), ["0001", "0002", "0003"]);
  assert.deepEqual(sortLuckyResults(rows, "absent").map(x => x.winning_number), ["0003", "0001", "0002"]);
  assert.deepEqual(sortLuckyResults(rows, "number").map(x => x.winning_number), ["0001", "0002", "0003"]);
});

test("URL parsing validates digits and safely defaults invalid controls", () => {
  assert.deepEqual(parseLuckySearch({ digits: "18", mode: "bad", sort: "bad" }), { digits: "18", mode: "ordered", sort: "score", valid: true, error: null });
  for (const digits of ["12345", "1a", "-1"]) assert.equal(parseLuckySearch({ digits }).error, "Enter 1 to 4 digits only.");
});

test("empty and database error results are represented without throwing", async () => {
  assert.deepEqual(await runLuckyQuery(async () => []), { data: [], error: null });
  const failed = await runLuckyQuery(async () => { throw new Error("database offline"); });
  assert.deepEqual(failed, { data: [], error: "database offline" });
});
