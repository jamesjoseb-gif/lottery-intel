import { pathToFileURL } from "node:url";

const EXPECTED = { first: 1, second: 1, third: 1, starter: 10, consolation: 10 };

export function verifyFourDIntegrity(rows) {
  const errors = [];
  const draws = new Map();

  for (const row of rows) {
    const key = row.draw_id ?? row.draw_no;
    if (!key) { errors.push("A row has no draw_id or draw_no."); continue; }
    draws.set(key, [...(draws.get(key) ?? []), row]);
  }

  for (const [draw, drawRows] of draws) {
    if (drawRows.length !== 23) errors.push(`Draw ${draw}: expected 23 rows, found ${drawRows.length}.`);
    for (const [type, expected] of Object.entries(EXPECTED)) {
      const typed = drawRows.filter((row) => row.prize_type === type);
      if (typed.length !== expected) errors.push(`Draw ${draw}: expected ${expected} ${type} row(s), found ${typed.length}.`);
      const positions = new Set(typed.map((row) => row.position));
      const expectedPositions = Array.from({ length: expected }, (_, index) => index + 1);
      if (positions.size !== typed.length || expectedPositions.some((position) => !positions.has(position))) {
        errors.push(`Draw ${draw}: ${type} positions are invalid or duplicated.`);
      }
    }
    for (const row of drawRows) {
      if (!Object.hasOwn(EXPECTED, row.prize_type)) errors.push(`Draw ${draw}: unknown prize type ${row.prize_type}.`);
      if (!/^\d{4}$/.test(String(row.winning_number))) errors.push(`Draw ${draw}: invalid number ${row.winning_number}.`);
    }
  }

  return { ok: errors.length === 0, drawsChecked: draws.size, rowsChecked: rows.length, errors };
}

async function fetchPublishedRows() {
  const base = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) throw new Error("Set SUPABASE_URL and a Supabase API key before verifying.");
  const response = await fetch(`${base}/rest/v1/published_fourd_results?select=draw_id,draw_no,prize_type,position,winning_number`, {
    headers: { apikey: key, authorization: `Bearer ${key}`, "Accept-Profile": "api_public" },
  });
  if (!response.ok) throw new Error(`Supabase returned ${response.status}: ${await response.text()}`);
  return response.json();
}

export async function run() {
  const result = verifyFourDIntegrity(await fetchPublishedRows());
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
