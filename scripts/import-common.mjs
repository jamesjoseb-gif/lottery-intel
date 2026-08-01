import { createHash } from "node:crypto";

export const ARCHIVE_ROOT = "https://www.singaporepools.com.sg/DataFileArchive/Lottery/Output/";

export function cleanHtml(value) {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}

export function isoDate(value) {
  const match = value.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?,?\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);
  if (!match) throw new Error("Could not parse draw date (official layout may have changed).");
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const month = months.indexOf(match[2].slice(0, 3).toLowerCase()) + 1;
  if (!month) throw new Error("Invalid draw date.");
  return `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

export function discover(html, detailPage) {
  const rows = [];
  for (const match of html.matchAll(/<option\b([^>]*)>([^<]+)<\/option>/gi)) {
    const drawNo = match[1].match(/\bvalue=['"](\d+)['"]/i)?.[1];
    const query = match[1].match(/\bqueryString=['"]sppl=([^'"]+)['"]/i)?.[1];
    if (drawNo && query) rows.push({ drawNo, drawDate: isoDate(match[2]), url: `${detailPage}?sppl=${encodeURIComponent(query)}` });
  }
  if (!rows.length) throw new Error("Official draw list contained no recognized draws (source layout changed).");
  return rows;
}

export function selectDraws(candidates, { drawNo, from, to } = {}) {
  if (from && to && from > to) throw new Error(`Invalid date range: ${from} is after ${to}.`);
  const matched = candidates.filter((row) => (!drawNo || row.drawNo === drawNo) && (!from || row.drawDate >= from) && (!to || row.drawDate <= to));
  return drawNo || from || to ? matched : matched.slice(0, 1);
}

export function importMode({ drawNo, from, to } = {}) {
  return drawNo ? "single" : from || to ? "backfill" : "latest";
}

export function validateIdentity(html, expectedDrawNo, url) {
  const text = cleanHtml(html);
  if (/page\s*not\s*found|object\s*moved/i.test(text)) throw new Error(`Page not found: ${url}`);
  const drawNo = text.match(/Draw\s*(?:No\.?|Number)\s*[:#-]?\s*(\d+)/i)?.[1];
  if (!drawNo) throw new Error("Could not parse draw number (official layout may have changed).");
  if (expectedDrawNo && drawNo !== expectedDrawNo) throw new Error(`Draw mismatch: expected ${expectedDrawNo}, found ${drawNo}.`);
  return { drawNo, drawDate: isoDate(text) };
}

export function checksum(draw) {
  return createHash("sha256").update(JSON.stringify({ drawNo: draw.drawNo, drawDate: draw.drawDate, results: draw.results })).digest("hex");
}

export async function request(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { "user-agent": "LotteryIntel/1.0 official-results-importer", ...init.headers }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}\n${await response.text()}`);
  return response;
}

async function api(path, key, init = {}) {
  const base = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  return request(`${base}/rest/v1/${path}`, { ...init, headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "return=representation", ...init.headers } });
}

export async function runImporter(config) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before importing.");
  const candidates = discover(await (await request(config.listUrl)).text(), config.detailPage);
  const requestedDraw = process.env.IMPORT_DRAW_NO;
  const from = process.env.IMPORT_FROM;
  const to = process.env.IMPORT_TO;
  const selected = selectDraws(candidates, { drawNo: requestedDraw, from, to });
  if (!selected.length) throw new Error("No official draws matched the requested draw/range.");
  const started = new Date().toISOString();
  const mode = importMode({ drawNo: requestedDraw, from, to });
  const runRes = await api("import_runs", key, { method: "POST", body: JSON.stringify({ mode, game_code: config.game, requested_from: from, requested_to: to, status: "running", created_by: config.importer, started_at: started, config: { source: config.listUrl, draw_no: requestedDraw ?? null } }) });
  const [{ id }] = await runRes.json(); let written = 0;
  try {
    for (const candidate of selected) {
      const draw = config.parse(await (await request(candidate.url)).text(), candidate.url, candidate.drawNo);
      const response = await api(`rpc/${config.rpc}`, key, { method: "POST", body: JSON.stringify({ p_import_run_id: id, p_draw_no: draw.drawNo, p_draw_date: draw.drawDate, p_source_url: draw.sourceUrl, p_checksum: checksum(draw), p_results: draw.results }) });
      if (await response.json()) written++;
    }
    await api(`import_runs?id=eq.${id}`, key, { method: "PATCH", body: JSON.stringify({ status: "completed", completed_at: new Date().toISOString(), summary: { draws_found: selected.length, draws_imported: written, draws_unchanged: selected.length - written } }) });
  } catch (error) {
    await api(`import_runs?id=eq.${id}`, key, { method: "PATCH", body: JSON.stringify({ status: "failed", completed_at: new Date().toISOString(), summary: { draws_found: selected.length, draws_imported: written, error: error.message } }) }); throw error;
  }
  console.log(JSON.stringify({ event: "import_complete", game: config.game, drawsFound: selected.length, drawsImported: written, drawsUnchanged: selected.length - written }));
  return { found: selected.length, written };
}
