import { pathToFileURL } from "node:url";

import { validateSweepDraw } from "./import-sweep.mjs";

export const EXPECTED_SWEEP_TIER_ROWS = Object.freeze({
  first: 1,
  second: 1,
  third: 1,
  jackpot: 10,
  lucky: 10,
  gift: 30,
  consolation: 30,
  participation: 50,
  "2d_delight": 9,
});

export const EXPECTED_SWEEP_RESULT_ROWS = Object.values(EXPECTED_SWEEP_TIER_ROWS)
  .reduce((total, count) => total + count, 0);

function drawIdentity(row) {
  return row.draw_id ?? `${row.draw_no ?? "<missing draw number>"}|${row.draw_date ?? "<missing draw date>"}`;
}

export function verifySweepRows(rows) {
  if (rows.length === 0) {
    return {
      ok: false,
      drawsChecked: 0,
      rowsChecked: 0,
      errors: ["Expected one published draw for latest draw, but found zero draws."],
    };
  }

  const latestDate = rows.reduce((latest, row) => row.draw_date > latest ? row.draw_date : latest, "");
  const latestRows = rows.filter((row) => row.draw_date === latestDate);
  const latestDraws = new Map();
  for (const row of latestRows) {
    const identity = drawIdentity(row);
    latestDraws.set(identity, [...(latestDraws.get(identity) ?? []), row]);
  }

  if (latestDraws.size !== 1) {
    return {
      ok: false,
      drawsChecked: latestDraws.size,
      rowsChecked: latestRows.length,
      errors: [`Expected one published draw for latest draw date ${latestDate || "<missing>"}, but found ${latestDraws.size} distinct draws.`],
    };
  }

  const [[identity, results]] = latestDraws;
  const drawNo = results[0]?.draw_no ?? String(identity);
  const errors = validateSweepDraw({ drawNo, drawDate: latestDate, results }).errors
    .map((error) => `Draw ${drawNo}: ${error}`);

  if (results.length !== EXPECTED_SWEEP_RESULT_ROWS) {
    errors.push(`Draw ${drawNo}: Expected ${EXPECTED_SWEEP_RESULT_ROWS} result rows, found ${results.length}.`);
  }

  const tierCounts = new Map();
  for (const row of results) tierCounts.set(row.tier_code, (tierCounts.get(row.tier_code) ?? 0) + 1);
  for (const [tier, expected] of Object.entries(EXPECTED_SWEEP_TIER_ROWS)) {
    const actual = tierCounts.get(tier) ?? 0;
    if (actual !== expected) errors.push(`Draw ${drawNo}: Expected ${expected} ${tier} result rows, found ${actual}.`);
  }
  for (const tier of tierCounts.keys()) {
    if (!(tier in EXPECTED_SWEEP_TIER_ROWS)) errors.push(`Draw ${drawNo}: Unexpected prize tier ${tier}.`);
  }

  return {
    ok: errors.length === 0,
    drawsChecked: 1,
    rowsChecked: results.length,
    errors,
  };
}

async function run() {
  const base = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) throw new Error("Set SUPABASE_URL and a Supabase API key before verifying.");
  const response = await fetch(`${base}/rest/v1/published_sweep_results?select=*&order=draw_date.desc,draw_no.desc`, {
    headers: { apikey: key, authorization: `Bearer ${key}`, "Accept-Profile": "api_public" },
  });
  if (!response.ok) throw new Error(`Supabase returned ${response.status}: ${await response.text()}`);
  const result = verifySweepRows(await response.json());
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
