import test from "node:test";
import assert from "node:assert/strict";
import { markdownSummary, run, yearlyRanges } from "./backfill-4d.mjs";

test("builds clamped calendar-year ranges and resumes at a selected year", () => {
  assert.deepEqual(yearlyRanges({ BACKFILL_FROM: "2008-06-01", BACKFILL_TO: "2010-07-26", RESUME_YEAR: "2009" }), [
    { year: 2009, from: "2009-01-01", to: "2009-12-31" },
    { year: 2010, from: "2010-01-01", to: "2010-07-26" },
  ]);
});

test("uses the approved default backfill range", () => {
  const ranges = yearlyRanges({});
  assert.deepEqual(ranges[0], { year: 2008, from: "2008-01-01", to: "2008-12-31" });
  assert.deepEqual(ranges.at(-1), { year: 2024, from: "2024-01-01", to: "2024-07-26" });
});

test("verifies each import before advancing and aggregates results", () => {
  const calls = [];
  const execute = (_command, args, env) => {
    calls.push({ script: args[0], env });
    return args[0].includes("import")
      ? JSON.stringify({ event: "import_complete", drawsFound: 2, drawsImported: 1, drawsUnchanged: 1 })
      : JSON.stringify({ ok: true });
  };
  const stats = run({ BACKFILL_FROM: "2023-01-01", BACKFILL_TO: "2024-07-26" }, execute);
  assert.deepEqual(calls.map(({ script }) => script), ["scripts/import-4d.mjs", "scripts/verify-4d-integrity.mjs", "scripts/import-4d.mjs", "scripts/verify-4d-integrity.mjs"]);
  assert.equal(calls[1].env.VERIFY_EXPECTED_DRAWS, "2");
  assert.deepEqual(stats, { attempted: [2023, 2024], completed: [2023, 2024], found: 4, imported: 2, unchanged: 2, failures: [] });
});

test("stops before the next year when verification fails", () => {
  let calls = 0;
  assert.throws(() => run({ BACKFILL_FROM: "2023-01-01", BACKFILL_TO: "2024-07-26" }, (_command, args) => {
    calls += 1;
    if (args[0].includes("import")) return JSON.stringify({ event: "import_complete", drawsFound: 2, drawsImported: 2, drawsUnchanged: 0 });
    throw new Error("verification failed");
  }), /verification failed/);
  assert.equal(calls, 2);
});

test("summary includes all required counters", () => {
  const summary = markdownSummary({ attempted: [2024], completed: [], found: 0, imported: 0, unchanged: 0, failures: ["2024: failed"] });
  for (const label of ["Years attempted", "Years completed", "Draws found", "Draws imported", "Draws unchanged", "Failures"]) assert.match(summary, new RegExp(label));
});
