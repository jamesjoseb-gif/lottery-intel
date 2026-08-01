import test from "node:test";
import assert from "node:assert/strict";
import { importMode, selectDraws } from "./import-common.mjs";

const draws = [
  { drawNo: "3", drawDate: "2026-03-01" },
  { drawNo: "2", drawDate: "2026-02-01" },
  { drawNo: "1", drawDate: "2026-01-01" },
];

test("selects only the latest draw when no selector is supplied", () => assert.deepEqual(selectDraws(draws), [draws[0]]));
test("supports inclusive historical date ranges across all exposed draws", () => assert.deepEqual(selectDraws(draws, { from: "2026-01-01", to: "2026-03-01" }), draws));
test("rejects reversed historical ranges", () => assert.throws(() => selectDraws(draws, { from: "2026-03-01", to: "2026-01-01" }), /Invalid date range/));
test("reports unscoped imports as latest rather than backfill", () => { assert.equal(importMode(), "latest"); assert.equal(importMode({ drawNo: "3" }), "single"); assert.equal(importMode({ from: "2026-01-01" }), "backfill"); });
