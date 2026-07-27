import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const ARCHIVE_LIST_URL =
  "https://www.singaporepools.com.sg/DataFileArchive/Lottery/Output/fourd_result_draw_list_en.html";

export const LEGACY_DETAIL_ROOT =
  "https://www.singaporepools.com.sg/DataFileArchive/Lottery/Output/";

export const CURRENT_RESULTS_URL =
  "https://www.singaporepools.com.sg/en/product/Pages/4d_results.aspx";

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

  return [...found.values()];
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
    throw new Error(`Page not found: ${sourceUrl}`);
  }

  const urlDrawNo = drawNoFromUrl(sourceUrl);
  const pageDrawNo = visibleDrawNo(source);
  const drawNo = expectedDrawNo ?? urlDrawNo ?? pageDrawNo;

  if (!drawNo) {
    throw new Error(`Could not determine draw number from ${sourceUrl}`);
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

async function request(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "user-agent": "LotteryIntel/1.0 (+Singapore 4D importer)",
      ...init.headers,
    },
    signal: AbortSignal.timeout(20_000),
  });

 if (!response.ok) {
  let responseBody = "";

  try {
    responseBody = await response.text();
  } catch {
    responseBody = "<unable to read response body>";
  }

  throw new Error(
    [
      `${response.status} ${response.statusText}`,
      `URL: ${url}`,
      "Response body:",
      responseBody,
    ].join("\n"),
  );
}

  return response;
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

  const cutoff = new Date(
    Date.UTC(
      now.getUTCFullYear() - 2,
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  );

  const archiveHtml = await (
    await request(ARCHIVE_LIST_URL)
  ).text();

  const candidates = discoverDrawCandidates(archiveHtml);

  if (!candidates.length) {
    throw new Error(
      "Singapore Pools archive did not contain any 4D draws.",
    );
  }

  const runResponse = await supabase(
    "import_runs",
    serviceKey,
    {
      method: "POST",
      body: JSON.stringify({
        mode: "backfill",
        game_code: "4d",
        requested_from: cutoff.toISOString().slice(0, 10),
        requested_to: now.toISOString().slice(0, 10),
        status: "running",
        created_by: "fourd-v4-importer",
        started_at: now.toISOString(),
        config: {
          source: ARCHIVE_LIST_URL,
          window_years: 2,
          sources: ["legacy_archive", "current_sppl"],
        },
      }),
    },
  );

  const [{ id: runId }] = await runResponse.json();

  let found = 0;
  let written = 0;

  try {
    for (const candidate of candidates) {
      const draw = await fetchCandidate(candidate);

      const date = new Date(`${draw.drawDate}T00:00:00Z`);

      if (date < cutoff || date > now) continue;

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
    }

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
