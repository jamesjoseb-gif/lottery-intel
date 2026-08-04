import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { type RankedNumber, type RankingKind, type RankingPeriod, type Rankings } from "@/lib/fourd-rankings";

type RankingResult = { data: Rankings | null; error: string | null; rowCount: number };

type RankingRpcRow = {
  ranking_kind: RankingKind; number: string; total_appearances: number; period_appearances: number;
  last_appearance: string; days_since_last_appearance: number; average_historical_gap: number | null;
  current_gap_versus_average: number | null; historical_activity_score: number;
  activity_label: RankedNumber["activityLabel"]; most_common_prize_type: RankedNumber["mostCommonPrizeType"];
  result_row_count: number;
};

const loadRankings = unstable_cache(async (period: RankingPeriod): Promise<{ rankings: Rankings; rowCount: number }> => {
  const client = createServerClient();
  if (!client) throw new Error("Supabase public credentials are unavailable.");
  const result = await client.schema("api_public").rpc("get_fourd_rankings", { p_period: period, p_limit: 50 });
  if (result.error) throw new Error(result.error.message);
  const rows = (result.data ?? []) as RankingRpcRow[];
  const rankings: Rankings = { hot: [], cold: [], overdue: [], recent: [] };
  rows.forEach((row) => rankings[row.ranking_kind].push({
    number: row.number, totalAppearances: row.total_appearances, periodAppearances: row.period_appearances,
    lastAppearance: row.last_appearance, daysSinceLastAppearance: row.days_since_last_appearance,
    averageHistoricalGap: row.average_historical_gap, currentGapVersusAverage: row.current_gap_versus_average,
    historicalActivityScore: row.historical_activity_score, activityLabel: row.activity_label,
    mostCommonPrizeType: row.most_common_prize_type,
  }));
  return { rankings, rowCount: rows[0]?.result_row_count ?? 0 };
}, ["published-4d-rankings-rpc-v1"], { revalidate: 3600, tags: ["4d-rankings"] });

export async function getFourDRankings(period: RankingPeriod): Promise<RankingResult> {
  try {
    const result = await loadRankings(period);
    return { data: result.rankings, error: null, rowCount: result.rowCount };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unable to load rankings.", rowCount: 0 };
  }
}
