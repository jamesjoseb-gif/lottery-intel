import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const ARCHIVE_URL = "https://www.singaporepools.com.sg/DataFileArchive/Lottery/Output/fourd_result_draw_list_en.html";
export const RESULTS_URL = "https://www.singaporepools.com.sg/en/product/Pages/4d_results.aspx";

function text(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}

function resultUrl(drawNo) {
  const sppl = Buffer.from(`DrawNumber=${drawNo}`).toString("base64");
  return `${RESULTS_URL}?sppl=${sppl}`;
}

export function discoverDrawUrls(html) {
  const found = new Map();
  for (const match of html.matchAll(/(?:href=["']([^"']*(?:fourd_result_draw_(\d+)\.html|4d_results\.aspx\?[^"']*sppl=[^"']+))["']|value=["']?(\d{4,})["']?)/gi)) {
    const drawNo = match[2] ?? match[3];
    if (drawNo) found.set(drawNo, resultUrl(drawNo));
  }
  return [...found.values()];
}

function numbersBetween(source, start, end, expected) {
  const from = source.search(start);
  if (from < 0) return null;
  const tail = source.slice(from).replace(start, "");
  const stop = tail.search(end);
  const values = (stop < 0 ? tail : tail.slice(0, stop)).match(/(?<!\d)\d{4}(?!\d)/g) ?? [];
  return values.length === expected ? values : null;
}

function winningNumbers(html, source, drawNo, dateMatch) {
  const top = numbersBetween(source, /1st\s*Prize/i, /Starter\s*Prizes?/i, 3);
  const starters = numbersBetween(source, /Starter\s*Prizes?/i, /Consolation\s*Prizes?/i, 10);
  const consolation = numbersBetween(source, /Consolation\s*Prizes?/i, /(?:Prizes?\s*not\s*claimed|Next\s*Draw|$)/i, 10);
  if (top && starters && consolation) return [...top, ...starters, ...consolation];

  const values = [];
  for (const match of html.matchAll(/<([a-z][\w:-]*)\b[^>]*>([^<>]*)<\/\1\s*>/gi)) {
    const value = text(match[2]);
    if (/^\d{4}$/.test(value)) values.push(value);
  }
  const year = dateMatch[3];
  const firstResult = values.findIndex((value) => value !== drawNo && value !== year);
  const results = firstResult < 0 ? [] : values.slice(firstResult, firstResult + 23);
  if (results.length !== 23) throw new Error(`Expected 23 winning numbers, found ${results.length}`);
  return results;
}

function drawNumber(source, sourceUrl) {
  const visible = source.match(/\bDraw\s*(?:(?:No\.?|Number)\s*)?[:#-]?\s*(\d{4,})\b/i)?.[1];
  if (visible) return visible;
  const encoded = new URL(sourceUrl).searchParams.get("sppl");
  if (encoded) {
    try {
      return Buffer.from(encoded, "base64").toString("utf8").match(/DrawNumber=(\d{4,})/i)?.[1];
    } catch {}
  }
  return sourceUrl.match(/fourd_result_draw_(\d+)\.html(?:[?#]|$)/i)?.[1];
}

function drawDateParts(source, html) {
  const header = source.split(/1st\s*Prize/i, 1)[0];
  const rawHeader = html.split(/1st(?:\s|&nbsp;|&#160;)*Prize/i, 1)[0];
  const candidates = [header, rawHeader.replace(/&(?:nbsp|#160|#x0*a0);/gi, " ")];
  const separator = "(?:\\s|[,./-]|&(?:nbsp|#160|#x0*a0);)+";
  const dayFirstPattern = new RegExp(`\\b(\\d{1,2})${separator}([A-Za-z]{3,9}|\\d{1,2})${separator}(\\d{4})\\b`, "i");
  const monthFirstPattern = new RegExp(`\\b([A-Za-z]{3,9})${separator}(\\d{1,2})${separator}(\\d{4})\\b`, "i");

  for (const candidate of candidates) {
    const labelled = candidate.match(new RegExp(`\\bDraw(?:${separator})?Date[^A-Za-z0-9]{0,80}${dayFirstPattern.source}`, "i"));
    if (labelled) return [labelled[0], labelled[1], labelled[2], labelled[3]];
    const iso = candidate.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (iso) return [iso[0], iso[3], iso[2], iso[1]];
    const dayFirst = candidate.match(dayFirstPattern);
    if (dayFirst) return dayFirst;
    const monthFirst = candidate.match(monthFirstPattern);
    if (monthFirst) return [monthFirst[0], monthFirst[2], monthFirst[1], monthFirst[3]];
  }
}

export function parseDraw(html, sourceUrl = ARCHIVE_URL) {
  const source = text(html);
  if (/Page\s+not\s+found/i.test(source)) throw new Error(`Singapore Pools returned a page-not-found response for ${sourceUrl}`);
  const drawNo = drawNumber(source, sourceUrl);
  const dateMatch = drawDateParts(source, html);
  if (!drawNo || !dateMatch) throw new Error(`Could not parse draw identity from ${sourceUrl}`);
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const month = /^\d+$/.test(dateMatch[2]) ? Number(dateMatch[2]) : months.indexOf(dateMatch[2].slice(0, 3).toLowerCase()) + 1;
  if (month < 1 || month > 12) throw new Error(`Invalid draw date in ${sourceUrl}`);
  const drawDate = `${dateMatch[3]}-${String(month).padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`;
  const values = winningNumbers(html, source, drawNo, dateMatch);
  const top = values.slice(0, 3);
  const starters = values.slice(3, 13);
  const consolation = values.slice(13);
  const results = ["first", "second", "third"].map((prize_type, i) => ({ prize_type, position: 1, winning_number: top[i] }));
  starters.forEach((winning_number, i) => results.push({ prize_type: "starter", position: i + 1, winning_number }));
  consolation.forEach((winning_number, i) => results.push({ prize_type: "consolation", position: i + 1, winning_number }));
  if (new Set(results.map((row) => row.winning_number)).size !== 23) throw new Error(`Duplicate winning number in draw ${drawNo}`);
  return { drawNo, drawDate, sourceUrl, results };
}

export function checksum(draw) {
  return createHash("sha256").update(JSON.stringify({ drawNo: draw.drawNo, drawDate: draw.drawDate, results: draw.results })).digest("hex");
}

async function request(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { "user-agent": "LotteryIntel/1.0 (+Singapore 4D importer)", ...init.headers }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response;
}

async function supabase(path, serviceKey, init = {}) {
  const base = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  return request(`${base}/rest/v1/${path}`, { ...init, headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json", prefer: "return=representation", ...init.headers } });
}

export async function run() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !serviceKey) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before importing.");
  const now = new Date();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear() - 2, now.getUTCMonth(), now.getUTCDate()));
  const archive = await (await request(ARCHIVE_URL)).text();
  const urls = discoverDrawUrls(archive);
  if (!urls.length) throw new Error("Singapore Pools archive did not contain any 4D draw numbers; its layout may have changed.");
  const runResponse = await supabase("import_runs", serviceKey, { method: "POST", body: JSON.stringify({ mode: "backfill", game_code: "4d", requested_from: cutoff.toISOString().slice(0, 10), requested_to: now.toISOString().slice(0, 10), status: "running", created_by: "fourd-v1-importer", started_at: now.toISOString(), config: { source: ARCHIVE_URL, window_years: 2 } }) });
  const [{ id: runId }] = await runResponse.json();
  let found = 0, written = 0;
  try {
    for (const url of urls) {
      const draw = parseDraw(await (await request(url)).text(), url);
      const date = new Date(`${draw.drawDate}T00:00:00Z`);
      if (date < cutoff || date > now) continue;
      found++;
      const response = await supabase("rpc/import_fourd_v1_draw", serviceKey, { method: "POST", body: JSON.stringify({ p_import_run_id: runId, p_draw_no: draw.drawNo, p_draw_date: draw.drawDate, p_source_url: url, p_checksum: checksum(draw), p_results: draw.results }) });
      if (await response.json()) written++;
    }
    await supabase(`import_runs?id=eq.${runId}`, serviceKey, { method: "PATCH", body: JSON.stringify({ status: "completed", completed_at: new Date().toISOString(), summary: { draws_found: found, draws_imported: written, draws_unchanged: found - written } }) });
  } catch (error) {
    await supabase(`import_runs?id=eq.${runId}`, serviceKey, { method: "PATCH", body: JSON.stringify({ status: "failed", completed_at: new Date().toISOString(), summary: { draws_found: found, draws_imported: written, error: error instanceof Error ? error.message : String(error) } }) });
    throw error;
  }
  console.log(JSON.stringify({ drawsFound: found, drawsImported: written, drawsUnchanged: found - written }));
  return { found, written };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
