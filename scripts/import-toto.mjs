import { pathToFileURL } from "node:url";
import { ARCHIVE_ROOT, cleanHtml, discover, runImporter, validateIdentity } from "./import-common.mjs";

export const LIST_URL = `${ARCHIVE_ROOT}toto_result_draw_list_en.html`;
export const DETAIL_PAGE = "https://www.singaporepools.com.sg/en/product/sr/Pages/toto_results.aspx";
export const discoverTotoDraws = (html) => discover(html, DETAIL_PAGE);

export function validateTotoDraw(draw) {
  const errors = []; const main = draw.results.filter((r) => r.number_kind === "main"); const additional = draw.results.filter((r) => r.number_kind === "additional");
  if (!draw.drawNo || !draw.drawDate) errors.push("Draw number and date are required.");
  if (main.length !== 6) errors.push(`Expected 6 main numbers, found ${main.length}.`);
  if (additional.length !== 1) errors.push(`Expected 1 additional number, found ${additional.length}.`);
  for (const row of draw.results) if (!Number.isInteger(row.winning_number) || row.winning_number < 1 || row.winning_number > 49) errors.push(`Invalid number ${row.winning_number}.`);
  if (new Set(main.map((r) => r.winning_number)).size !== main.length) errors.push("Duplicate main numbers.");
  if (additional[0] && main.some((r) => r.winning_number === additional[0].winning_number)) errors.push("Additional number duplicates a main number.");
  for (const [kind, rows, count] of [["main", main, 6], ["additional", additional, 1]]) if (new Set(rows.map((r) => r.position)).size !== count || rows.some((r) => r.position < 1 || r.position > count)) errors.push(`${kind} positions are incomplete or duplicated.`);
  return { ok: !errors.length, errors };
}

export function parseTotoDraw(html, sourceUrl = DETAIL_PAGE, expectedDrawNo = null) {
  const identity = validateIdentity(html, expectedDrawNo, sourceUrl);
  const main = [...html.matchAll(/class=['"]win([1-6])['"][^>]*>\s*(\d+)\s*</gi)].map((m) => ({ number_kind: "main", position: Number(m[1]), winning_number: Number(m[2]) }));
  const extra = html.match(/class=['"]additional['"][^>]*>\s*(\d+)\s*</i);
  const draw = { ...identity, sourceUrl, results: [...main, ...(extra ? [{ number_kind: "additional", position: 1, winning_number: Number(extra[1]) }] : [])] };
  const result = validateTotoDraw(draw); if (!result.ok) throw new Error(`Invalid TOTO draw ${draw.drawNo}: ${result.errors.join(" ")}`); return draw;
}

export async function run() { return runImporter({ game: "toto", importer: "toto-v1-importer", listUrl: LIST_URL, detailPage: DETAIL_PAGE, parse: parseTotoDraw, rpc: "import_toto_v1_draw" }); }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run().catch((e) => { console.error(e.message); process.exitCode = 1; });
