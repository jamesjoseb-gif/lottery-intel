import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const DEFAULT_FROM = "2008-01-01";
export const DEFAULT_TO = "2024-07-26";

function validDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function yearlyRanges(env = process.env) {
  const from = (env.BACKFILL_FROM || DEFAULT_FROM).trim();
  const to = (env.BACKFILL_TO || DEFAULT_TO).trim();
  const resumeYear = (env.RESUME_YEAR || "").trim();
  if (!validDate(from) || !validDate(to) || from > to) throw new Error("BACKFILL_FROM and BACKFILL_TO must be a valid inclusive range.");
  if (resumeYear && !/^\d{4}$/.test(resumeYear)) throw new Error("RESUME_YEAR must be blank or a four-digit year.");

  const firstYear = Math.max(Number(from.slice(0, 4)), resumeYear ? Number(resumeYear) : 0);
  const lastYear = Number(to.slice(0, 4));
  if (firstYear > lastYear) throw new Error("RESUME_YEAR is after the requested range.");

  return Array.from({ length: lastYear - firstYear + 1 }, (_, offset) => {
    const year = firstYear + offset;
    return {
      year,
      from: year === Number(from.slice(0, 4)) ? from : `${year}-01-01`,
      to: year === lastYear ? to : `${year}-12-31`,
    };
  });
}

export function markdownSummary(stats) {
  const lines = [
    "## 4D historical backfill",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Years attempted | ${stats.attempted.join(", ") || "None"} |`,
    `| Years completed | ${stats.completed.join(", ") || "None"} |`,
    `| Draws found | ${stats.found} |`,
    `| Draws imported | ${stats.imported} |`,
    `| Draws unchanged | ${stats.unchanged} |`,
    `| Failures | ${stats.failures.length} |`,
  ];
  if (stats.failures.length) lines.push("", "### Failures", ...stats.failures.map((failure) => `- ${failure}`));
  return `${lines.join("\n")}\n`;
}

function resultEvent(output) {
  for (const line of output.trim().split("\n").reverse()) {
    try {
      const value = JSON.parse(line);
      if (value.event === "import_complete") return value;
    } catch { /* importer also emits human-readable diagnostics */ }
  }
  throw new Error("Importer succeeded without an import_complete result.");
}

export function runCommand(command, args, env) {
  const result = spawnSync(command, args, { env, encoding: "utf8" });
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} exited with status ${result.status}.`);
  return result.stdout || "";
}

export function run(env = process.env, execute = runCommand) {
  const stats = { attempted: [], completed: [], found: 0, imported: 0, unchanged: 0, failures: [] };
  try {
    for (const range of yearlyRanges(env)) {
      stats.attempted.push(range.year);
      console.log(`::group::Import and verify ${range.year} (${range.from} through ${range.to})`);
      try {
        const output = execute(process.execPath, ["scripts/import-4d.mjs"], { ...env, IMPORT_FROM: range.from, IMPORT_TO: range.to });
        const imported = resultEvent(output);
        stats.found += imported.drawsFound;
        stats.imported += imported.drawsImported;
        stats.unchanged += imported.drawsUnchanged;
        execute(process.execPath, ["scripts/verify-4d-integrity.mjs"], {
          ...env,
          VERIFY_FROM: range.from,
          VERIFY_TO: range.to,
          VERIFY_EXPECTED_DRAWS: String(imported.drawsFound),
        });
        stats.completed.push(range.year);
      } catch (error) {
        stats.failures.push(`${range.year}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      } finally {
        console.log("::endgroup::");
      }
    }
    return stats;
  } finally {
    const summary = markdownSummary(stats);
    console.log(summary);
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, summary);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { run(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
