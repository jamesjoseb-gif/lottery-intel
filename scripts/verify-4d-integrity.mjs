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

export async function fetchPublishedRows(fetchImpl = fetch) {
  const base = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) throw new Error("Set SUPABASE_URL and a Supabase API key before verifying.");
  const rows = [];
  const pageSize = 1_000;

  while (true) {
    const query = new URLSearchParams({
      select: "draw_id,draw_no,draw_date,prize_type,position,winning_number",
      order: "draw_id,prize_type,position",
      limit: String(pageSize),
      offset: String(rows.length),
    });
    if (process.env.VERIFY_FROM) query.set("draw_date", `gte.${process.env.VERIFY_FROM}`);
    if (process.env.VERIFY_TO) query.append("draw_date", `lte.${process.env.VERIFY_TO}`);
    const response = await fetchImpl(`${base}/rest/v1/published_fourd_results?${query}`, {
      headers: { apikey: key, authorization: `Bearer ${key}`, "Accept-Profile": "api_public" },
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}: ${await response.text()}`);

    const page = await response.json();
    rows.push(...page);

    // PostgREST may return fewer rows than the requested limit when its server-side
    // max-rows setting is lower, so only an empty page proves that pagination ended.
    if (page.length === 0) return rows;
  }
}

export async function run() {
  const result = verifyFourDIntegrity(await fetchPublishedRows());
  const expected = process.env.VERIFY_EXPECTED_DRAWS;
  if (expected && result.drawsChecked !== Number(expected)) {
    result.ok = false;
    result.errors.push(`Expected ${expected} published draw(s) in the verification range, found ${result.drawsChecked}.`);
  }
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
