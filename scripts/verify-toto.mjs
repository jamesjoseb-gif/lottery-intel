import { pathToFileURL } from "node:url";
import { validateTotoDraw } from "./import-toto.mjs";

export function verifyTotoRows(rows) {
  const draws = new Map();

  for (const row of rows) {
    const id = row.draw_id ?? row.draw_no;
    draws.set(id, [...(draws.get(id) ?? []), row]);
  }

  const errors = [];

  for (const [id, results] of draws) {
    const result = validateTotoDraw({
      drawNo: String(id),
      drawDate: results[0]?.draw_date,
      results,
    });
    errors.push(...result.errors.map((error) => `Draw ${id}: ${error}`));
  }

  return {
    ok: errors.length === 0,
    drawsChecked: draws.size,
    rowsChecked: rows.length,
    errors,
  };
}

function buildResultsUrl(base) {
  const url = new URL(`${base}/rest/v1/published_toto_results`);
  url.searchParams.set("select", "*");
  url.searchParams.set("order", "draw_date.asc,draw_id.asc,position.asc");

  const from = process.env.IMPORT_FROM?.trim();
  const to = process.env.IMPORT_TO?.trim();

  if (from) url.searchParams.append("draw_date", `gte.${from}`);
  if (to) url.searchParams.append("draw_date", `lte.${to}`);

  return url;
}

async function fetchAllPublishedRows(base, key) {
  const pageSize = 1000;
  const rows = [];
  const url = buildResultsUrl(base);

  for (let offset = 0; ; offset += pageSize) {
    const response = await fetch(url, {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "Accept-Profile": "api_public",
        Range: `${offset}-${offset + pageSize - 1}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase returned ${response.status}: ${await response.text()}`);
    }

    const page = await response.json();
    rows.push(...page);

    if (page.length < pageSize) break;
  }

  return rows;
}

async function run() {
  const base = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!base || !key) {
    throw new Error("Set SUPABASE_URL and a Supabase API key before verifying.");
  }

  const rows = await fetchAllPublishedRows(base, key);
  const result = verifyTotoRows(rows);
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
