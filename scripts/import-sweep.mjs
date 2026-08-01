import { pathToFileURL } from "node:url";
import { ARCHIVE_ROOT, cleanHtml, discover, runImporter, validateIdentity } from "./import-common.mjs";

export const LIST_URL = `${ARCHIVE_ROOT}sweep_result_draw_list_en.html`;
export const DETAIL_PAGE = "https://www.singaporepools.com.sg/en/sweep/pages/results.aspx";
export const discoverSweepDraws = (html) => discover(html, DETAIL_PAGE);
const code = (label) => /1st Prize/i.test(label) ? "first" : /2nd Prize/i.test(label) ? "second" : /3rd Prize/i.test(label) ? "third" : label.toLowerCase().replace(/@.*$/, "").replace(/^\s*\d[\d,]*\s+/, "").replace(/\s+prizes?\s*$/, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export function validateSweepDraw(draw) {
  const errors = []; const required = ["first", "second", "third"];
  if (!draw.drawNo || !draw.drawDate) errors.push("Draw number and date are required.");
  for (const tier of required) if (!draw.results.some((r) => r.tier_code === tier)) errors.push(`Missing required ${tier} tier.`);
  for (const row of draw.results) if (!row.source_label?.trim() || !row.ticket_number || !row.source_display_value?.trim() || !/^\d+$/.test(row.ticket_number)) errors.push("Malformed or empty result row.");
  for (const tier of new Set(draw.results.map((r) => r.tier_code))) { const rows = draw.results.filter((r) => r.tier_code === tier); if (new Set(rows.map((r) => r.position)).size !== rows.length) errors.push(`Duplicate position in ${tier}.`); }
  return { ok: !errors.length, errors };
}

function entries(fragment) { return [...fragment.matchAll(/<(td|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => { const display = cleanHtml(m[2]).replace(/\s/g, ""); const suffix = m[2].match(/class=['"]underline['"][^>]*>\s*(\d+)\s*</i)?.[1] ?? null; return { display, suffix }; }).filter((x) => /^\d+$/.test(x.display)); }
function classContent(fragment, className) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return fragment.match(new RegExp(`<([a-z][\\w:-]*)\\b[^>]*class=['"][^'"]*\\b${escaped}\\b[^'"]*['"][^>]*>([\\s\\S]*?)<\\/\\1\\s*>`, "i"))?.[2] ?? "";
}
export function parseSweepDraw(html, sourceUrl = DETAIL_PAGE, expectedDrawNo = null) {
  const identity = validateIdentity(html, expectedDrawNo, sourceUrl); const desktop = html.match(/class=['"][^'"]*pure-desktop-only[^'"]*['"]>([\s\S]*?)<div class=['"]mobile-only/i)?.[1] ?? html; const results = [];
  const top = [["first", "headingFirstPrize", "valueFirstPrize"], ["second", "headingSecondPrize", "valueSecondPrize"], ["third", "headingThirdPrize", "valueThirdPrize"]];
  for (const [tier, heading, value] of top) { const label = cleanHtml(desktop.match(new RegExp(`class=['"]${heading}['"][^>]*>([\\s\\S]*?)<`, "i"))?.[1] ?? ""); const match = desktop.match(new RegExp(`class=['"]${value}['"][^>]*>([\\s\\S]*?)<\\/td>`, "i")); if (match) { const display = cleanHtml(match[1]).replace(/\s/g, ""); const suffix = match[1].match(/class=['"]underline['"][^>]*>\s*(\d+)\s*</i)?.[1] ?? null; if (/^\d+$/.test(display)) results.push({ tier_code: tier, source_label: label, position: 1, ticket_number: display, series: null, entry_suffix: suffix, source_display_value: display }); } }
  for (const table of desktop.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) { const label = cleanHtml(classContent(table[1], "prizeGroupHeading")); if (!label) continue; entries(table[1].match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] ?? "").forEach(({ display, suffix }, i) => results.push({ tier_code: code(label), source_label: label, position: i + 1, ticket_number: display, series: null, entry_suffix: suffix, source_display_value: display })); }
  const draw = { ...identity, sourceUrl, results }; const checked = validateSweepDraw(draw); if (!checked.ok) throw new Error(`Invalid Big Sweep draw ${draw.drawNo}: ${checked.errors.join(" ")}`); return draw;
}
export async function run() { return runImporter({ game: "sweep", importer: "sweep-v1-importer", listUrl: LIST_URL, detailPage: DETAIL_PAGE, parse: parseSweepDraw, rpc: "import_sweep_v1_draw" }); }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run().catch((e) => { console.error(e.message); process.exitCode = 1; });
