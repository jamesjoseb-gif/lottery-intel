import { scoreHistoricalActivity } from "./number-intelligence.ts";

export const rankingTabs = ["hot", "cold", "overdue", "recent"] as const;
export const rankingPeriods = ["30", "90", "365", "all"] as const;
export type RankingTab = (typeof rankingTabs)[number];
export type RankingPeriod = (typeof rankingPeriods)[number];

export type FourDRankingAggregate = {
  winning_number: string;
  total_appearances: number;
  appearances_30_days: number;
  appearances_90_days: number;
  appearances_365_days: number;
  appearances_12_months: number;
  appearances_24_months: number;
  archive_total_appearances: number;
  archive_12_months_appearances: number;
  archive_24_months_appearances: number;
  last_appearance: string;
  average_historical_gap: number | null;
  current_gap: number;
  current_gap_to_average_ratio: number | null;
  most_common_prize_type: string;
};

export type RankedFourDNumber = FourDRankingAggregate & { periodAppearances: number; activityScore: number };

export function normalizeRankingTab(value?: string): RankingTab { return rankingTabs.includes(value as RankingTab) ? value as RankingTab : "hot"; }
export function normalizeRankingPeriod(value?: string): RankingPeriod { return rankingPeriods.includes(value as RankingPeriod) ? value as RankingPeriod : "365"; }

export function rankFourDNumbers(rows: FourDRankingAggregate[], tab: RankingTab, period: RankingPeriod, limit = 100): RankedFourDNumber[] {
  const periodKey = period === "30" ? "appearances_30_days" : period === "90" ? "appearances_90_days" : period === "365" ? "appearances_365_days" : "total_appearances";
  const enriched = rows.map((row) => ({
    ...row,
    periodAppearances: row[periodKey],
    activityScore: scoreHistoricalActivity({
      frequencyComparedWithAverage: row.archive_total_appearances ? row.total_appearances / (row.archive_total_appearances / 10_000) : 0,
      daysSinceLastAppearance: row.current_gap,
      last12MonthsComparedWithAverage: row.archive_12_months_appearances ? row.appearances_12_months / (row.archive_12_months_appearances / 10_000) : 0,
      last24MonthsComparedWithAverage: row.archive_24_months_appearances ? row.appearances_24_months / (row.archive_24_months_appearances / 10_000) : 0,
    }).value,
  }));
  const numberTie = (a: RankedFourDNumber, b: RankedFourDNumber) => a.winning_number.localeCompare(b.winning_number);
  enriched.sort((a, b) => {
    if (tab === "recent") return b.last_appearance.localeCompare(a.last_appearance) || numberTie(a, b);
    if (tab === "overdue") return (b.current_gap_to_average_ratio ?? -1) - (a.current_gap_to_average_ratio ?? -1) || numberTie(a, b);
    if (tab === "cold") return a.periodAppearances - b.periodAppearances || b.current_gap - a.current_gap || numberTie(a, b);
    return b.periodAppearances - a.periodAppearances || b.activityScore - a.activityScore || numberTie(a, b);
  });
  return enriched.slice(0, limit);
}
