import test from "node:test";
import assert from "node:assert/strict";
import { importMode, importRunRecord, importSelectors, selectDraws } from "./import-common.mjs";

const draws = [
  { drawNo: "3", drawDate: "2026-03-01" },
  { drawNo: "2", drawDate: "2026-02-01" },
  { drawNo: "1", drawDate: "2026-01-01" },
];

test("selects only the latest draw when no selector is supplied", () => assert.deepEqual(selectDraws(draws), [draws[0]]));
test("blank workflow inputs are normalized to null", () => {
  assert.deepEqual(importSelectors({ IMPORT_DRAW_NO: "", IMPORT_FROM: "", IMPORT_TO: "" }), { drawNo: null, from: null, to: null });
  assert.deepEqual(importSelectors({ IMPORT_DRAW_NO: "  ", IMPORT_FROM: "\t", IMPORT_TO: "\n" }), { drawNo: null, from: null, to: null });
});
test("normalized blank workflow inputs retain latest mode and select one draw", () => {
  const selectors = importSelectors({ IMPORT_DRAW_NO: "", IMPORT_FROM: "", IMPORT_TO: "" });
  assert.equal(importMode(selectors), "latest");
  assert.deepEqual(selectDraws(draws, selectors), [draws[0]]);
});
test("TOTO and Big Sweep import runs store blank workflow dates as null", () => {
  const selectors = importSelectors({ IMPORT_DRAW_NO: "", IMPORT_FROM: "", IMPORT_TO: "" });
  for (const game of ["toto", "sweep"]) {
    const record = importRunRecord({ game, importer: `${game}-importer`, listUrl: `${game}-list` }, selectors, "2026-08-01T00:00:00.000Z");
    assert.equal(record.game_code, game);
    assert.equal(record.mode, "latest");
    assert.equal(record.requested_from, null);
    assert.equal(record.requested_to, null);
    assert.equal(record.config.draw_no, null);
  }
});
test("nonblank workflow inputs are trimmed and retained", () => assert.deepEqual(
  importSelectors({ IMPORT_DRAW_NO: " 3 ", IMPORT_FROM: " 2026-01-01", IMPORT_TO: "2026-03-01 " }),
  { drawNo: "3", from: "2026-01-01", to: "2026-03-01" },
));
test("supports inclusive historical date ranges across all exposed draws", () => assert.deepEqual(selectDraws(draws, { from: "2026-01-01", to: "2026-03-01" }), draws));
test("rejects reversed historical ranges", () => assert.throws(() => selectDraws(draws, { from: "2026-03-01", to: "2026-01-01" }), /Invalid date range/));
test("reports unscoped imports as latest rather than backfill", () => { assert.equal(importMode(), "latest"); assert.equal(importMode({ drawNo: "3" }), "single"); assert.equal(importMode({ from: "2026-01-01" }), "backfill"); });
