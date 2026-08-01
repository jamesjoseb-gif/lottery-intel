import { pathToFileURL } from "node:url";
import { request, selectDraws } from "./import-common.mjs";
import { discoverTotoDraws, LIST_URL as TOTO_LIST_URL, parseTotoDraw } from "./import-toto.mjs";
import { discoverSweepDraws, LIST_URL as SWEEP_LIST_URL, parseSweepDraw } from "./import-sweep.mjs";

const EXPECTED_SWEEP_ROWS = {
  first: 1,
  second: 1,
  third: 1,
  jackpot: 10,
  lucky: 10,
  gift: 30,
  consolation: 30,
  participation: 50,
  "2d_delight": 9,
};

async function verifyGame(name, listUrl, discoverDraws, parseDraw) {
  const draws = discoverDraws(await (await request(listUrl)).text());
  const latest = draws[0];
  const parsed = parseDraw(await (await request(latest.url)).text(), latest.url, latest.drawNo);
  const dates = draws.map((draw) => draw.drawDate).sort();
  const selected = selectDraws(draws, { from: dates[0], to: dates.at(-1) });
  if (selected.length !== draws.length) throw new Error(`${name}: full archive date range selected ${selected.length} of ${draws.length} draws.`);
  return { draws, latest, parsed, archiveFrom: dates[0], archiveTo: dates.at(-1) };
}

export async function verifyLiveSources() {
  const toto = await verifyGame("TOTO", TOTO_LIST_URL, discoverTotoDraws, parseTotoDraw);
  const sweep = await verifyGame("Big Sweep", SWEEP_LIST_URL, discoverSweepDraws, parseSweepDraw);
  const sweepRows = Object.fromEntries([...new Set(sweep.parsed.results.map((row) => row.tier_code))].map((tier) => [tier, sweep.parsed.results.filter((row) => row.tier_code === tier).length]));
  for (const [tier, count] of Object.entries(EXPECTED_SWEEP_ROWS)) {
    if (sweepRows[tier] !== count) throw new Error(`Big Sweep: expected ${count} current ${tier} result rows, found ${sweepRows[tier] ?? 0} (official layout or prize structure changed).`);
  }
  if (Object.keys(sweepRows).length !== Object.keys(EXPECTED_SWEEP_ROWS).length) throw new Error(`Big Sweep: unexpected tier set ${Object.keys(sweepRows).join(", ")} (official prize structure changed).`);
  return {
    toto: { drawsDiscovered: toto.draws.length, archiveFrom: toto.archiveFrom, archiveTo: toto.archiveTo, latestDraw: toto.latest.drawNo, latestDate: toto.latest.drawDate, resultRows: toto.parsed.results.length },
    sweep: { drawsDiscovered: sweep.draws.length, archiveFrom: sweep.archiveFrom, archiveTo: sweep.archiveTo, latestDraw: sweep.latest.drawNo, latestDate: sweep.latest.drawDate, resultRows: sweep.parsed.results.length, tiers: sweepRows },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyLiveSources().then((result) => console.log(JSON.stringify({ ok: true, ...result }, null, 2))).catch((error) => { console.error(`LIVE SOURCE VERIFICATION FAILED: ${error.message}`); process.exitCode = 1; });
}
