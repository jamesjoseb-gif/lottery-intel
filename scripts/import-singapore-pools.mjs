#!/usr/bin/env node

/**
 * Singapore Pools public-results importer.
 *
 * Usage examples:
 *   node scripts/import-singapore-pools.mjs --game 4d --from 5400 --to 5512 --dry-run
 *   node scripts/import-singapore-pools.mjs --game toto --from 4100 --to 4200 --dry-run
 *
 * Required for database writes:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * The script only reads publicly available result pages. It rate-limits requests,
 * retries temporary failures, validates each draw, and upserts by (game, draw_no).
 */

import { createClient } from '@supabase/supabase-js';

const BASE_URLS = {
  '4d': 'https://www.singaporepools.com.sg/en/product/Pages/4d_results.aspx',
  toto: 'https://www.singaporepools.com.sg/en/product/sr/Pages/toto_results.aspx',
};

const args = Object.fromEntries(
  process.argv.slice(2).map((entry, index, all) => {
    if (!entry.startsWith('--')) return [entry, true];
    const key = entry.slice(2);
    const next = all[index + 1];
    return [key, next && !next.startsWith('--') ? next : true];
  }),
);

const game = String(args.game || '').toLowerCase();
const from = Number(args.from);
const to = Number(args.to);
const dryRun = Boolean(args['dry-run']);
const delayMs = Number(args.delay || 900);

if (!['4d', 'toto'].includes(game) || !Number.isInteger(from) || !Number.isInteger(to)) {
  console.error('Usage: node scripts/import-singapore-pools.mjs --game 4d|toto --from DRAW --to DRAW [--dry-run] [--delay 900]');
  process.exit(1);
}

if (from > to) {
  console.error('--from must be less than or equal to --to');
  process.exit(1);
}

const supabase = dryRun
  ? null
  : createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildDrawUrl(gameName, drawNo) {
  const sppl = Buffer.from(`DrawNumber=${drawNo}`, 'utf8').toString('base64');
  return `${BASE_URLS[gameName]}?sppl=${encodeURIComponent(sppl)}`;
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function htmlToText(html) {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>|<\/div>|<\/tr>|<\/li>|<\/h\d>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[\t ]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': 'LotteryIntel/1.0 (+https://lottery-intel.com; public results importer)',
          accept: 'text/html,application/xhtml+xml',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 1500);
    }
  }
  throw lastError;
}

function findDrawDate(text) {
  const patterns = [
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/i,
    /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const date = new Date(`${match[1]} 20:00:00 +0800`);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
  }
  throw new Error('Draw date not found');
}

function numbersAfterLabel(text, label, count, digits) {
  const index = text.toLowerCase().indexOf(label.toLowerCase());
  if (index < 0) throw new Error(`Section not found: ${label}`);
  const section = text.slice(index, index + 1800);
  const regex = new RegExp(`\\b\\d{${digits}}\\b`, 'g');
  const values = section.match(regex) || [];
  return values.slice(0, count);
}

function parse4D(html, drawNo, sourceUrl) {
  const text = htmlToText(html);
  const first = numbersAfterLabel(text, '1st Prize', 1, 4)[0];
  const second = numbersAfterLabel(text, '2nd Prize', 1, 4)[0];
  const third = numbersAfterLabel(text, '3rd Prize', 1, 4)[0];
  const starter = numbersAfterLabel(text, 'Starter Prizes', 10, 4);
  const consolation = numbersAfterLabel(text, 'Consolation Prizes', 10, 4);

  const all = [first, second, third, ...starter, ...consolation];
  if (all.length !== 23 || all.some((value) => !/^\d{4}$/.test(value))) {
    throw new Error(`Invalid 4D draw: expected 23 four-digit numbers, received ${all.length}`);
  }

  return {
    game: '4d',
    drawNo: String(drawNo),
    drawDate: findDrawDate(text),
    sourceUrl,
    results: [
      { prize_type: 'first', winning_number: first, position: null },
      { prize_type: 'second', winning_number: second, position: null },
      { prize_type: 'third', winning_number: third, position: null },
      ...starter.map((winning_number, index) => ({ prize_type: 'starter', winning_number, position: index + 1 })),
      ...consolation.map((winning_number, index) => ({ prize_type: 'consolation', winning_number, position: index + 1 })),
    ],
  };
}

function parseToto(html, drawNo, sourceUrl) {
  const text = htmlToText(html);
  const anchor = Math.max(text.toLowerCase().indexOf('winning numbers'), text.toLowerCase().indexOf('toto'));
  const section = text.slice(Math.max(anchor, 0), Math.max(anchor, 0) + 2500);
  const candidates = (section.match(/\b(?:[1-9]|[1-4]\d)\b/g) || []).map(Number);

  const unique = [];
  for (const value of candidates) {
    if (value >= 1 && value <= 49 && !unique.includes(value)) unique.push(value);
    if (unique.length === 7) break;
  }

  if (unique.length !== 7) {
    throw new Error(`Invalid TOTO draw: expected 7 unique numbers, received ${unique.length}`);
  }

  return {
    game: 'toto',
    drawNo: String(drawNo),
    drawDate: findDrawDate(text),
    sourceUrl,
    results: unique.map((winning_number, index) => ({
      winning_number,
      position: index + 1,
      is_additional: index === 6,
    })),
  };
}

async function writeDraw(parsed) {
  const { data: draw, error: drawError } = await supabase
    .from('draws')
    .upsert(
      {
        game: parsed.game,
        draw_no: parsed.drawNo,
        draw_date: parsed.drawDate,
        status: 'validated',
        source_url: parsed.sourceUrl,
        source_published_at: parsed.drawDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'game,draw_no' },
    )
    .select('id')
    .single();

  if (drawError) throw drawError;

  const table = parsed.game === '4d' ? 'four_d_results' : 'toto_results';
  const { error: deleteError } = await supabase.from(table).delete().eq('draw_id', draw.id);
  if (deleteError) throw deleteError;

  const rows = parsed.results.map((result) => ({ ...result, draw_id: draw.id }));
  const { error: insertError } = await supabase.from(table).insert(rows);
  if (insertError) throw insertError;

  const { error: publishError } = await supabase
    .from('draws')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', draw.id);
  if (publishError) throw publishError;
}

let imported = 0;
let skipped = 0;
let failed = 0;

for (let drawNo = from; drawNo <= to; drawNo += 1) {
  const sourceUrl = buildDrawUrl(game, drawNo);
  try {
    const html = await fetchWithRetry(sourceUrl);
    const parsed = game === '4d' ? parse4D(html, drawNo, sourceUrl) : parseToto(html, drawNo, sourceUrl);

    if (dryRun) {
      console.log(JSON.stringify(parsed, null, 2));
    } else {
      await writeDraw(parsed);
      console.log(`Imported ${game.toUpperCase()} draw ${drawNo} (${parsed.drawDate.slice(0, 10)})`);
    }
    imported += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not found|section not found|draw date not found|invalid/i.test(message)) {
      console.warn(`Skipped draw ${drawNo}: ${message}`);
      skipped += 1;
    } else {
      console.error(`Failed draw ${drawNo}: ${message}`);
      failed += 1;
    }
  }

  if (drawNo < to) await sleep(delayMs);
}

console.log(`Done. Imported: ${imported}, skipped: ${skipped}, failed: ${failed}`);
if (failed > 0) process.exitCode = 1;
