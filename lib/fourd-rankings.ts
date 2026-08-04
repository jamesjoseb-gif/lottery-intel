import { getActivityLabel, scoreHistoricalActivity, type ActivityLabel, type PrizeType } from "./number-intelligence.ts";

export const rankingPeriods = ["30", "90", "365", "all"] as const;
export const rankingKinds = ["hot", "cold", "overdue", "recent"] as const;
export type RankingPeriod = (typeof rankingPeriods)[number];
export type RankingKind = (typeof rankingKinds)[number];

export type RankingAppearance = { winning_number: string; draw_date: string; prize_type: PrizeType };
export type RankedNumber = {
  number: string;
  totalAppearances: number;
  periodAppearances: number;
  lastAppearance: string;
  daysSinceLastAppearance: number;
  averageHistoricalGap: number | null;
  currentGapVersusAverage: number | null;
  historicalActivityScore: number;
  activityLabel: ActivityLabel;
  mostCommonPrizeType: PrizeType;
};
export type Rankings = Record<RankingKind, RankedNumber[]>;

const DAY = 86_400_000;
const NUMBER_SPACE = 10_000;
const PRIZE_ORDER: PrizeType[] = ["first", "second", "third", "starter", "consolation"];
const dateValue = (date: string) => Date.parse(`${date}T00:00:00Z`);
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

export function normalizeRankingPeriod(value?: string): RankingPeriod {
  return rankingPeriods.includes(value as RankingPeriod) ? value as RankingPeriod : "90";
}

export function normalizeRankingKind(value?: string): RankingKind {
  return rankingKinds.includes(value as RankingKind) ? value as RankingKind : "hot";
}

function periodCutoff(asOf: Date, period: RankingPeriod) {
  if (period === "all") return Number.NEGATIVE_INFINITY;
  return asOf.getTime() - Number(period) * DAY;
}

/**
 * Builds all rankings in one pass over the published archive. The displayed Historical
 * Activity Score reuses Number Intelligence's bounded 0–100 formula. Hot order uses a
 * deterministic composite: 50% activity score, 35% selected-period frequency (relative
 * to the busiest number), and 15% recency. Cold requires at least two appearances so a
 * gap is meaningful, then orders by fewest period appearances, longest absence and lower
 * activity. Overdue orders by current gap / that number's mean historical gap. Recent
 * winners order by latest date. Every ranking ends with exact number ascending as a
 * stable tie-break, preserving values such as 0007 as strings.
 */
export function buildFourDRankings(rows: RankingAppearance[], period: RankingPeriod, options: { asOf?: Date; limit?: number } = {}): Rankings {
  const asOf = options.asOf ?? new Date();
  const limit = clamp(Math.floor(options.limit ?? 50), 0, 50);
  const cutoff = periodCutoff(asOf, period);
  const cutoff12 = asOf.getTime() - 365 * DAY;
  const cutoff24 = asOf.getTime() - 730 * DAY;
  const validRows = rows.filter((row) => /^\d{4}$/.test(row.winning_number) && Number.isFinite(dateValue(row.draw_date)));
  const groups = new Map<string, RankingAppearance[]>();
  validRows.forEach((row) => groups.set(row.winning_number, [...(groups.get(row.winning_number) ?? []), row]));
  const archive12 = validRows.filter((row) => dateValue(row.draw_date) >= cutoff12).length;
  const archive24 = validRows.filter((row) => dateValue(row.draw_date) >= cutoff24).length;

  const base: RankedNumber[] = [...groups].map(([number, appearances]) => {
    const ordered = appearances.sort((a, b) => dateValue(a.draw_date) - dateValue(b.draw_date));
    const lastAppearance = ordered.at(-1)!.draw_date;
    const gaps = ordered.slice(1).map((row, index) => (dateValue(row.draw_date) - dateValue(ordered[index].draw_date)) / DAY);
    const averageHistoricalGap = gaps.length ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) : null;
    const daysSinceLastAppearance = Math.max(0, Math.floor((asOf.getTime() - dateValue(lastAppearance)) / DAY));
    const periodAppearances = ordered.filter((row) => dateValue(row.draw_date) >= cutoff).length;
    const last12 = ordered.filter((row) => dateValue(row.draw_date) >= cutoff12).length;
    const last24 = ordered.filter((row) => dateValue(row.draw_date) >= cutoff24).length;
    const prizeCounts = new Map(PRIZE_ORDER.map((prize) => [prize, 0]));
    ordered.forEach((row) => prizeCounts.set(row.prize_type, (prizeCounts.get(row.prize_type) ?? 0) + 1));
    const mostCommonPrizeType = PRIZE_ORDER.reduce((best, prize) => prizeCounts.get(prize)! > prizeCounts.get(best)! ? prize : best);
    const score = scoreHistoricalActivity({
      frequencyComparedWithAverage: validRows.length ? ordered.length / (validRows.length / NUMBER_SPACE) : 0,
      daysSinceLastAppearance,
      last12MonthsComparedWithAverage: archive12 ? last12 / (archive12 / NUMBER_SPACE) : 0,
      last24MonthsComparedWithAverage: archive24 ? last24 / (archive24 / NUMBER_SPACE) : 0,
    }).value;
    return { number, totalAppearances: ordered.length, periodAppearances, lastAppearance, daysSinceLastAppearance, averageHistoricalGap, currentGapVersusAverage: averageHistoricalGap && averageHistoricalGap > 0 ? daysSinceLastAppearance / averageHistoricalGap : null, historicalActivityScore: score, activityLabel: getActivityLabel(score), mostCommonPrizeType };
  });

  const numberTie = (a: RankedNumber, b: RankedNumber) => a.number.localeCompare(b.number);
  const maximumPeriod = Math.max(1, ...base.map((item) => item.periodAppearances));
  const hotValue = (item: RankedNumber) => item.historicalActivityScore * .5 + item.periodAppearances / maximumPeriod * 35 + Math.max(0, 1 - item.daysSinceLastAppearance / 365) * 15;
  const hot = [...base].sort((a, b) => hotValue(b) - hotValue(a) || b.periodAppearances - a.periodAppearances || b.lastAppearance.localeCompare(a.lastAppearance) || numberTie(a, b));
  const sufficient = base.filter((item) => item.totalAppearances >= 2 && item.averageHistoricalGap !== null);
  const cold = [...sufficient].sort((a, b) => a.periodAppearances - b.periodAppearances || b.daysSinceLastAppearance - a.daysSinceLastAppearance || a.historicalActivityScore - b.historicalActivityScore || numberTie(a, b));
  const overdue = sufficient.filter((item) => item.currentGapVersusAverage !== null && item.currentGapVersusAverage > 1).sort((a, b) => b.currentGapVersusAverage! - a.currentGapVersusAverage! || b.daysSinceLastAppearance - a.daysSinceLastAppearance || numberTie(a, b));
  const recent = [...base].sort((a, b) => b.lastAppearance.localeCompare(a.lastAppearance) || b.periodAppearances - a.periodAppearances || numberTie(a, b));
  return { hot: hot.slice(0, limit), cold: cold.slice(0, limit), overdue: overdue.slice(0, limit), recent: recent.slice(0, limit) };
}
