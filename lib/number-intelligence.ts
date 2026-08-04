import type { NumberAppearance } from "./fourd-number.ts";

export const activityLabels = ["Very Low", "Low", "Moderate", "High", "Very High"] as const;
export type ActivityLabel = (typeof activityLabels)[number];
export type PrizeType = NumberAppearance["prize_type"];

export type HistoricalActivityScoreInput = {
  frequencyComparedWithAverage: number;
  daysSinceLastAppearance: number | null;
  last12MonthsComparedWithAverage: number;
  last24MonthsComparedWithAverage: number;
};

export type HistoricalActivityScore = {
  value: number;
  label: ActivityLabel;
  components: { frequency: number; recency: number; recentActivity: number };
  explanation: string;
};

export type NumberIntelligence = {
  totalAppearances: number;
  appearanceRate: number;
  frequencyComparedWithAverage: number;
  daysSinceLastAppearance: number | null;
  averageGap: number | null;
  longestGap: number | null;
  shortestGap: number | null;
  appearancesLast12Months: number;
  appearancesLast24Months: number;
  mostCommonPrizeType: PrizeType | null;
  activeYears: number[];
  recentTrend: "Increasing" | "Stable" | "Decreasing" | "No recent activity";
  trendSummary: string;
  score: HistoricalActivityScore;
};

export type NumberIntelligenceContext = {
  totalArchiveAppearances: number;
  archiveAppearancesLast12Months: number;
  archiveAppearancesLast24Months: number;
  asOf?: Date;
};

const DAY = 86_400_000;
const NUMBER_SPACE = 10_000;
const prizeOrder: PrizeType[] = ["first", "second", "third", "starter", "consolation"];
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const ratio = (actual: number, average: number) => average > 0 ? actual / average : 0;
const dateValue = (value: string) => Date.parse(`${value}T00:00:00Z`);

export function getActivityLabel(score: number): ActivityLabel {
  if (score < 20) return "Very Low";
  if (score < 40) return "Low";
  if (score < 60) return "Moderate";
  if (score < 80) return "High";
  return "Very High";
}

/** Score historical activity only; this is not an estimate of a future outcome. */
export function scoreHistoricalActivity(input: HistoricalActivityScoreInput): HistoricalActivityScore {
  const frequency = Math.round(clamp(input.frequencyComparedWithAverage / 2, 0, 1) * 40);
  const days = input.daysSinceLastAppearance;
  const recency = days === null ? 0 : days <= 30 ? 30 : days <= 90 ? 25 : days <= 180 ? 20 : days <= 365 ? 15 : days <= 730 ? 8 : 0;
  const recent12 = clamp(input.last12MonthsComparedWithAverage / 2, 0, 1) * 20;
  const recent24 = clamp(input.last24MonthsComparedWithAverage / 2, 0, 1) * 10;
  const recentActivity = Math.round(recent12 + recent24);
  const value = clamp(frequency + recency + recentActivity, 0, 100);
  return {
    value,
    label: getActivityLabel(value),
    components: { frequency, recency, recentActivity },
    explanation: `Frequency ${frequency}/40 + recency ${recency}/30 + recent activity ${recentActivity}/30.`,
  };
}

function monthsAgo(date: Date, months: number) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() - months);
  return result.getTime();
}

/** Build a deterministic intelligence summary from verified exact-match archive rows. */
export function buildNumberIntelligence(rows: NumberAppearance[], context: NumberIntelligenceContext): NumberIntelligence {
  const asOf = context.asOf ?? new Date();
  const ordered = [...rows].sort((a, b) => dateValue(a.draw_date) - dateValue(b.draw_date));
  const gaps = ordered.slice(1).map((row, index) => Math.round((dateValue(row.draw_date) - dateValue(ordered[index].draw_date)) / DAY));
  const last = ordered.at(-1);
  const cutoff12 = monthsAgo(asOf, 12);
  const cutoff24 = monthsAgo(asOf, 24);
  const appearancesLast12Months = rows.filter((row) => dateValue(row.draw_date) >= cutoff12).length;
  const appearancesLast24Months = rows.filter((row) => dateValue(row.draw_date) >= cutoff24).length;
  const prior12Months = appearancesLast24Months - appearancesLast12Months;
  const average = context.totalArchiveAppearances / NUMBER_SPACE;
  const frequencyComparedWithAverage = ratio(rows.length, average);
  const recent12Ratio = ratio(appearancesLast12Months, context.archiveAppearancesLast12Months / NUMBER_SPACE);
  const recent24Ratio = ratio(appearancesLast24Months, context.archiveAppearancesLast24Months / NUMBER_SPACE);
  const prizeCounts = new Map<PrizeType, number>(prizeOrder.map((prize) => [prize, 0]));
  rows.forEach((row) => prizeCounts.set(row.prize_type, (prizeCounts.get(row.prize_type) ?? 0) + 1));
  const mostCommonPrizeType = rows.length ? prizeOrder.reduce((best, prize) => (prizeCounts.get(prize)! > prizeCounts.get(best)! ? prize : best)) : null;
  const recentTrend = appearancesLast24Months === 0 ? "No recent activity" : appearancesLast12Months > prior12Months ? "Increasing" : appearancesLast12Months < prior12Months ? "Decreasing" : "Stable";
  const trendSummary = recentTrend === "No recent activity"
    ? "No appearances were recorded in the last 24 months."
    : `${appearancesLast12Months} ${appearancesLast12Months === 1 ? "appearance" : "appearances"} in the last 12 months, compared with ${prior12Months} in the preceding 12 months; recent historical activity is ${recentTrend.toLowerCase()}.`;
  const daysSinceLastAppearance = last ? Math.max(0, Math.floor((asOf.getTime() - dateValue(last.draw_date)) / DAY)) : null;
  return {
    totalAppearances: rows.length,
    appearanceRate: context.totalArchiveAppearances > 0 ? rows.length / context.totalArchiveAppearances : 0,
    frequencyComparedWithAverage,
    daysSinceLastAppearance,
    averageGap: gaps.length ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) : null,
    longestGap: gaps.length ? Math.max(...gaps) : null,
    shortestGap: gaps.length ? Math.min(...gaps) : null,
    appearancesLast12Months,
    appearancesLast24Months,
    mostCommonPrizeType,
    activeYears: [...new Set(rows.map((row) => Number(row.draw_date.slice(0, 4))))].sort((a, b) => a - b),
    recentTrend,
    trendSummary,
    score: scoreHistoricalActivity({ frequencyComparedWithAverage, daysSinceLastAppearance, last12MonthsComparedWithAverage: recent12Ratio, last24MonthsComparedWithAverage: recent24Ratio }),
  };
}
