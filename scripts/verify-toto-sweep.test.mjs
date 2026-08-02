import test from "node:test";
import assert from "node:assert/strict";

import { verifyTotoRows } from "./verify-toto.mjs";
import { EXPECTED_SWEEP_TIER_ROWS, verifySweepRows } from "./verify-sweep.mjs";

function completeSweepDraw({ drawId = "latest-id", drawNo = "1092", drawDate = "2026-07-01" } = {}) {
  return Object.entries(EXPECTED_SWEEP_TIER_ROWS).flatMap(([tier, count]) =>
    Array.from({ length: count }, (_, index) => {
      const ticketNumber = String(index + 1).padStart(tier === "2d_delight" ? 2 : 7, "0");
      return {
        draw_id: drawId,
        draw_no: drawNo,
        draw_date: drawDate,
        tier_code: tier,
        source_label: `${tier} prize`,
        position: index + 1,
        ticket_number: ticketNumber,
        source_display_value: ticketNumber,
      };
    }),
  );
}

test("TOTO verifier accepts complete published rows", () => {
  const rows = [1, 2, 3, 4, 5, 6].map((winningNumber, index) => ({
    draw_no: "1", draw_date: "2026-01-01", number_kind: "main", position: index + 1, winning_number: winningNumber,
  })).concat({ draw_no: "1", draw_date: "2026-01-01", number_kind: "additional", position: 1, winning_number: 7 });
  assert.equal(verifyTotoRows(rows).ok, true);
});

test("Sweep verifier accepts one complete latest draw with all 142 result rows", () => {
  const result = verifySweepRows(completeSweepDraw());
  assert.deepEqual({ ok: result.ok, drawsChecked: result.drawsChecked, rowsChecked: result.rowsChecked }, { ok: true, drawsChecked: 1, rowsChecked: 142 });
});

test("Sweep verifier deduplicates result rows by draw identity and ignores older draws", () => {
  const rows = completeSweepDraw().concat(completeSweepDraw({ drawId: "older-id", drawNo: "1091", drawDate: "2026-06-01" }).slice(0, 3));
  const result = verifySweepRows(rows);
  assert.deepEqual({ ok: result.ok, drawsChecked: result.drawsChecked, rowsChecked: result.rowsChecked }, { ok: true, drawsChecked: 1, rowsChecked: 142 });
});

test("Sweep verifier clearly rejects zero published draws", () => {
  const result = verifySweepRows([]);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /found zero draws/);
});

test("Sweep verifier clearly rejects multiple distinct draws on the latest date", () => {
  const rows = completeSweepDraw().concat(completeSweepDraw({ drawId: "other-id", drawNo: "1093" }));
  const result = verifySweepRows(rows);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /found 2 distinct draws/);
});

test("Sweep verifier rejects missing tiers, wrong row totals, and malformed tickets", () => {
  const rows = completeSweepDraw().filter((row) => row.tier_code !== "third");
  rows[0].ticket_number = "12-34567";
  const result = verifySweepRows(rows);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => /Malformed or empty result row/.test(error)));
  assert.ok(result.errors.some((error) => /Expected 142 result rows, found 141/.test(error)));
  assert.ok(result.errors.some((error) => /Expected 1 third result rows, found 0/.test(error)));
});

test("Sweep verifier detects duplicate tier positions", () => {
  const rows = completeSweepDraw();
  rows[4].position = rows[3].position;
  assert.equal(verifySweepRows(rows).ok, false);
});
