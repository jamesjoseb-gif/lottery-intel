import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const ARCHIVE_LIST_URL =
  "https://www.singaporepools.com.sg/DataFileArchive/Lottery/Output/fourd_result_draw_list_en.html";

export const LEGACY_DETAIL_ROOT =
  "https://www.singaporepools.com.sg/DataFileArchive/Lottery/Output/";

export const CURRENT_RESULTS_URL =
  "https://www.singaporepools.com.sg/en/product/Pages/4d_results.aspx";

export const EARLIEST_SUPPORTED_DRAW = 1;
export const EARLIEST_SUPPORTED_DATE = "1986-05-31";
export const MAX_BATCH_DAYS = 370;

function cleanText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function currentResultUrl(drawNo) {
  const sppl = Buffer.from(`DrawNumber=${drawNo}`).toString("base64");
  return `${CURRENT_RESULTS_URL}?sppl=${sppl}`;
}

function isoArchiveDate(value) {
  const match = value.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);
  if (!match) return null;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const month = months.indexOf(match[2].slice(0, 3).toLowerCase()) + 1;
  return month ? `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}` : null;
}

function legacyResultUrl(drawNo) {
  return `${LEGACY_DETAIL_ROOT}fourd_result_draw_${drawNo}.html`;
}

function drawNoFromUrl(url) {
  try {
    const parsed = new URL(url);

    const encoded = parsed.searchParams.get("sppl");
    if (encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const match = decoded.match(/DrawNumber=(\d{4,})/i);
      if (match) return match[1];
    }

    const legacy = parsed.pathname.match(/fourd_result_draw_(\d+)\.html$/i);
    if (legacy) return legacy[1];
  } catch {
    return null;
  }

  return null;
}

function visibleDrawNo(source) {
  return source.match(
    /\bDraw\s*(?:(?:No\.?|Number)\s*)?[:#-]?\s*(\d{4,})\b/i,
  )?.[1] ?? null;
}

export function discoverDrawCandidates(html) {
  const found = new Map();

  for (const match of html.matchAll(
    /href=["']([^"']*fourd_result_draw_(\d+)\.html)["']/gi,
  )) {
    const href = new URL(match[1], ARCHIVE_LIST_URL).href;
    const drawNo = match[2];

    found.set(drawNo, {
      drawNo,
      urls: [href, currentResultUrl(drawNo)],
    });
  }

  for (const match of html.matchAll(
    /href=["']([^"']*4d_results\.aspx\?[^"']*sppl=[^"']+)["']/gi,
  )) {
    const href = new URL(match[1], ARCHIVE_LIST_URL).href;
    const drawNo = drawNoFromUrl(href);

    if (!drawNo) continue;

    const existing = found.get(drawNo);

    found.set(drawNo, {
      drawNo,
      urls: existing
        ? [...new Set([href, ...existing.urls])]
        : [href, legacyResultUrl(drawNo)],
    });
  }

  for (const match of html.matchAll(/value=["']?(\d{4,})["']?/gi)) {
    const drawNo = match[1];

    if (!found.has(drawNo)) {
      found.set(drawNo, {
        drawNo,
        urls: [currentResultUrl(drawNo), legacyResultUrl(drawNo)],
      });
    }
  }

  for (const match of html.matchAll(
    /<option\b[^>]*value=['"]?(\d+)['"]?[^>]*queryString=['"][^'"]+['"][^>]*isCancelled=['"]([^'"]*)['"][^>]*>([^<]+)<\/option>/gi,
  )) {
    const existing = found.get(match[1]);
    if (existing) {
      existing.drawDate = isoArchiveDate(match[3]);
      existing.cancelled = match[2].trim() !== "";
    }
  }

  return [...found.values()];
}

export function discoverDrawUrls(html) {
  return discoverDrawCandidates(html).map(({ urls }) => urls[0]);
}

function numbersBetween(source, start, end, expected) {
  const from = source.search(start);
  if (from < 0) return null;

  const tail = source.slice(from).replace(start, "");
  const stop = tail.search(end);
  const section = stop < 0 ? tail : tail.slice(0, stop);
  const values = section.match(/(?<!\d)\d{4}(?!\d)/g) ?? [];

  return values.length === expected ? values : null;
}

function extractWinningNumbers(html, source, drawNo, drawDateParts) {
  const top = numbersBetween(
    source,
    /1st\s*Prize/i,
    /Starter\s*Prizes?/i,
    3,
  );

  const starters = numbersBetween(
    source,
    /Starter\s*Prizes?/i,
    /Consolation\s*Prizes?/i,
    10,
  );

  const consolation = numbersBetween(
    source,
    /Consolation\s*Prizes?/i,
    /(?:Prizes?\s*not\s*claimed|Next\s*Draw|$)/i,
    10,
  );

  if (top && starters && consolation) {
    return [...top, ...starters, ...consolation];
  }

  const values = [];

  for (const match of html.matchAll(
    /<([a-z][\w:-]*)\b[^>]*>([^<>]*)<\/\1\s*>/gi,
  )) {
    const value = cleanText(match[2]);
    if (/^\d{4}$/.test(value)) values.push(value);
  }

  const year = drawDateParts[3];

  const firstResult = values.findIndex(
    (value) => value !== drawNo && value !== year,
  );

  const results =
    firstResult < 0
      ? []
      : values.slice(firstResult, firstResult + 23);

  if (results.length !== 23) {
    throw new Error(
      `Expected 23 winning numbers, found ${results.length}`,
    );
  }

  return results;
}

function drawDateParts(source, html) {
  const header = source.split(/1st\s*Prize/i, 1)[0];
  const rawHeader = html.split(/1st(?:\s|&nbsp;|&#160;)*Prize/i, 1)[0];

  const candidates = [
    header,
    rawHeader.replace(/&(?:nbsp|#160|#x0*a0);/gi, " "),
  ];

  const separator = "(?:\\s|[,./-]|&(?:nbsp|#160|#x0*a0);)+";

  const dayFirstPattern = new RegExp(
    `\\b(\\d{1,2})${separator}([A-Za-z]{3,9}|\\d{1,2})${separator}(\\d{4})\\b`,
    "i",
  );

  const monthFirstPattern = new RegExp(
    `\\b([A-Za-z]{3,9})${separator}(\\d{1,2})${separator}(\\d{4})\\b`,
    "i",
  );

  for (const candidate of candidates) {
    const labelled = candidate.match(
      new RegExp(
        `\\bDraw(?:${separator})?Date[^A-Za-z0-9]{0,80}${dayFirstPattern.source}`,
        "i",
      ),
    );

    if (labelled) {
      return [labelled[0], labelled[1], labelled[2], labelled[3]];
    }

    const iso = candidate.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (iso) return [iso[0], iso[3], iso[2], iso[1]];

    const dayFirst = candidate.match(dayFirstPattern);
    if (dayFirst) return dayFirst;

    const monthFirst = candidate.match(monthFirstPattern);
    if (monthFirst) {
      return [monthFirst[0], monthFirst[2], monthFirst[1], monthFirst[3]];
    }
  }

  return null;
}

function buildResults(values, drawNo) {
  const top = values.slice(0, 3);
  const starters = values.slice(3, 13);
  const consolation = values.slice(13);

  const results = ["first", "second", "third"].map(
    (prize_type, index) => ({
      prize_type,
      position: 1,
      winning_number: top[index],
    }),
  );

  starters.forEach((winning_number, index) => {
    results.push({
      prize_type: "starter",
      position: index + 1,
      winning_number,
    });
  });

  consolation.forEach((winning_number, index) => {
    results.push({
      prize_type: "consolation",
      position: index + 1,
      winning_number,
    });
  });

  const expectedCounts = {
    first: 1,
    second: 1,
    third: 1,
    starter: 10,
    consolation: 10,
  };

  if (results.length !== 23) {
    throw new Error(
      `Expected 23 results in draw ${drawNo}, found ${results.length}`,
    );
  }

  for (const [prizeType, expected] of Object.entries(expectedCounts)) {
    const actual = results.filter(
      (row) => row.prize_type === prizeType,
    ).length;

    if (actual !== expected) {
      throw new Error(
        `Expected ${expected} ${prizeType} result(s) in draw ${drawNo}, found ${actual}`,
      );
    }
  }

  if (
    results.some(
      (row) =>
        !Number.isInteger(row.position) ||
        row.position < 1 ||
        !/^\d{4}$/.test(row.winning_number),
    )
  ) {
    throw new Error(`Invalid result format in draw ${drawNo}`);
  }

  return results;
}

export function parseDraw(
  html,
  sourceUrl,
  expectedDrawNo = null,
) {
  const source = cleanText(html);

  if (/Page\s+not\s+found/i.test(source)) {
    throw new Error(`Page-not-found response: ${sourceUrl}`);
  }

  const urlDrawNo = drawNoFromUrl(sourceUrl);
  const pageDrawNo = visibleDrawNo(source);
  const drawNo = expectedDrawNo ?? urlDrawNo ?? pageDrawNo;

  if (!drawNo) {
    throw new Error(`Could not determine draw number from ${sourceUrl}`);
  }

  if (!pageDrawNo) {
    throw new Error(`Could not verify draw number in official page ${sourceUrl}`);
  }

  if (pageDrawNo !== String(drawNo)) {
    throw new Error(`Page draw mismatch: expected ${drawNo}, got ${pageDrawNo}`);
  }

  if (expectedDrawNo && urlDrawNo && urlDrawNo !== expectedDrawNo) {
    throw new Error(
      `URL draw mismatch: expected ${expectedDrawNo}, got ${urlDrawNo}`,
    );
  }

  const dateMatch = drawDateParts(source, html);

  if (!dateMatch) {
    throw new Error(`Could not parse draw date from ${sourceUrl}`);
  }

  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];

  const month = /^\d+$/.test(dateMatch[2])
    ? Number(dateMatch[2])
    : months.indexOf(dateMatch[2].slice(0, 3).toLowerCase()) + 1;

  if (month < 1 || month > 12) {
    throw new Error(`Invalid draw date in ${sourceUrl}`);
  }

  const drawDate =
    `${dateMatch[3]}-${String(month).padStart(2, "0")}-` +
    `${dateMatch[1].padStart(2, "0")}`;

  const values = extractWinningNumbers(
    html,
    source,
    drawNo,
    dateMatch,
  );

  return {
    drawNo,
    drawDate,
    sourceUrl,
    results: buildResults(values, drawNo),
  };
}

export function checksum(draw) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        drawNo: draw.drawNo,
        drawDate: draw.drawDate,
        results: draw.results,
      }),
    )
    .digest("hex");
}

export async function request(url, init = {}, { attempts = 4 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "user-agent": "LotteryIntel/1.0 (+Singapore 4D importer)",
          ...init.headers,
        },
        signal: AbortSignal.timeout(20_000),
      });

      if (response.ok) return response;
      const responseBody = await response.text().catch(() => "<unable to read response body>");
      const error = new Error(`${response.status} ${response.statusText}\nURL: ${url}\nResponse body:\n${responseBody}`);
      if (response.status !== 429 && response.status < 500) {
        error.retryable = false;
        throw error;
      }
      lastError = error;
    } catch (error) {
      if (error?.retryable === false) throw error;
      lastError = error;
      if (attempt === attempts) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** (attempt - 1))));
  }

  throw lastError;
}

async function supabase(path, serviceKey, init = {}) {
  const base =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  return request(`${base}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...init.headers,
    },
  });
}

async function fetchCandidate(candidate) {
  const errors = [];

  for (const url of candidate.urls) {
    try {
      const html = await (await request(url)).text();
      const draw = parseDraw(html, url, candidate.drawNo);

      console.log(
        JSON.stringify({
          event: "draw_parsed",
          drawNo: draw.drawNo,
          drawDate: draw.drawDate,
          sourceUrl: url,
        }),
      );

      return draw;
    } catch (error) {
      errors.push({
        url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw new Error(
    `All sources failed for draw ${candidate.drawNo}: ${JSON.stringify(errors)}`,
  );
}

export function importRange(env = process.env) {
  const from = env.IMPORT_FROM?.trim();
  const to = env.IMPORT_TO?.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(to ?? "")) {
    throw new Error("IMPORT_FROM and IMPORT_TO are required in YYYY-MM-DD format.");
  }
  const today = new Date().toISOString().slice(0, 10);
  const validDate = (value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  };
  if (!validDate(from) || !validDate(to) || from < EARLIEST_SUPPORTED_DATE || from > to || to > today) {
    throw new Error("Requested 4D date range is invalid or unsupported.");
  }
  const days = Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
  if (days > MAX_BATCH_DAYS) throw new Error(`4D batches may not exceed ${MAX_BATCH_DAYS} days.`);
  return { from, to };
}

export async function findDrawBoundary(targetDate, low, high, findFirst, fetcher = fetchCandidate) {
  let answer = findFirst ? high + 1 : low - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const draw = await fetcher({ drawNo: String(middle), urls: [currentResultUrl(String(middle))] });
    if (draw.drawDate > targetDate || (findFirst && draw.drawDate === targetDate)) {
      if (draw.drawDate === targetDate || findFirst) answer = middle;
      high = middle - 1;
    } else {
      if (!findFirst) answer = middle;
      low = middle + 1;
    }
  }
  return answer;
}

export async function run() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!base || !serviceKey) {
    throw new Error(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before importing.",
    );
  }

  const now = new Date();
  const { from, to } = importRange();

  const archiveHtml = await (
    await request(ARCHIVE_LIST_URL)
  ).text();

  const candidates = discoverDrawCandidates(archiveHtml);

  if (!candidates.length) {
    throw new Error(
      "Singapore Pools archive did not contain any 4D draws.",
    );
  }

  const latestDrawNo = Math.max(...candidates.map(({ drawNo }) => Number(drawNo)));
  const firstDraw = await findDrawBoundary(from, EARLIEST_SUPPORTED_DRAW, latestDrawNo, true);
  const lastDraw = await findDrawBoundary(to, EARLIEST_SUPPORTED_DRAW, latestDrawNo, false);
  if (firstDraw > lastDraw) throw new Error("No published official 4D draws matched the requested range.");
  const selected = [];
  for (let drawNo = firstDraw; drawNo <= lastDraw; drawNo += 1) {
    selected.push(candidates.find((candidate) => Number(candidate.drawNo) === drawNo) ?? {
      drawNo: String(drawNo), urls: [currentResultUrl(String(drawNo))],
    });
  }

  const runResponse = await supabase(
    "import_runs",
    serviceKey,
    {
      method: "POST",
      body: JSON.stringify({
        mode: "backfill",
        game_code: "4d",
        requested_from: from,
        requested_to: to,
        status: "running",
        created_by: "fourd-v4-importer",
        started_at: now.toISOString(),
        config: {
          source: ARCHIVE_LIST_URL,
          supported_from: EARLIEST_SUPPORTED_DATE,
          draw_from: firstDraw,
          draw_to: lastDraw,
          sources: ["legacy_archive", "current_sppl"],
        },
      }),
    },
  );

  const [{ id: runId }] = await runResponse.json();

  let found = 0;
  let written = 0;
  const failures = [];

  try {
    for (const candidate of selected) {
      if (candidate.cancelled) {
        console.log(JSON.stringify({ event: "draw_cancelled", drawNo: candidate.drawNo }));
        continue;
      }
      let draw;
      try {
        draw = await fetchCandidate(candidate);
      } catch (error) {
        failures.push({ drawNo: candidate.drawNo, error: error instanceof Error ? error.message : String(error) });
        console.error(JSON.stringify({ event: "draw_failed", ...failures.at(-1) }));
        continue;
      }

      if (draw.drawDate < from || draw.drawDate > to) continue;

      found += 1;

      console.log(
        JSON.stringify({
          event: "draw_import_start",
          drawNo: draw.drawNo,
          drawDate: draw.drawDate,
          sourceUrl: draw.sourceUrl,
        }),
      );

      const response = await supabase(
        "rpc/import_fourd_v1_draw",
        serviceKey,
        {
          method: "POST",
          body: JSON.stringify({
            p_import_run_id: runId,
            p_draw_no: draw.drawNo,
            p_draw_date: draw.drawDate,
            p_source_url: draw.sourceUrl,
            p_checksum: checksum(draw),
            p_results: draw.results,
          }),
        },
      );

      if (await response.json()) written += 1;
      await supabase(`import_runs?id=eq.${runId}`, serviceKey, {
        method: "PATCH",
        body: JSON.stringify({ heartbeat_at: new Date().toISOString(), summary: { draws_found: found, draws_imported: written, failures } }),
      });
    }

    if (failures.length) throw new Error(`${failures.length} draw(s) failed; rerun this range after review.`);

    await supabase(
      `import_runs?id=eq.${runId}`,
      serviceKey,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "completed",
          completed_at: new Date().toISOString(),
          summary: {
            draws_found: found,
            draws_imported: written,
            draws_unchanged: found - written,
          },
        }),
      },
    );
  } catch (error) {
    await supabase(
      `import_runs?id=eq.${runId}`,
      serviceKey,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "failed",
          completed_at: new Date().toISOString(),
          summary: {
            draws_found: found,
            draws_imported: written,
            error:
              error instanceof Error ? error.message : String(error),
          },
        }),
      },
    );

    throw error;
  }

  console.log(
    JSON.stringify({
      event: "import_complete",
      drawsFound: found,
      drawsImported: written,
      drawsUnchanged: found - written,
    }),
  );

  return { found, written };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
