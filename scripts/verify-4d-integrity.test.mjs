import test from "node:test";
import assert from "node:assert/strict";
import { verifyFourDIntegrity } from "./verify-4d-integrity.mjs";

function validRows() {
  return Object.entries({ first: 1, second: 1, third: 1, starter: 10, consolation: 10 }).flatMap(([prize_type, count], typeIndex) =>
    Array.from({ length: count }, (_, index) => ({ draw_id: "draw-1", prize_type, position: index + 1, winning_number: String(typeIndex * 100 + index).padStart(4, "0") })),
  );
}

test("accepts a complete published 4D draw", () => {
  assert.deepEqual(verifyFourDIntegrity(validRows()), { ok: true, drawsChecked: 1, rowsChecked: 23, errors: [] });
});

test("allows a winning number to repeat in different prize slots", () => {
  const rows = validRows(); rows[1].winning_number = rows[0].winning_number;
  assert.equal(verifyFourDIntegrity(rows).ok, true);
});

test("reports missing rows, duplicate positions, and malformed numbers", () => {
  const rows = validRows().slice(1); rows[3].position = rows[2].position; rows[2].winning_number = "123";
  const result = verifyFourDIntegrity(rows);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /expected 23|positions|invalid number/);
});
