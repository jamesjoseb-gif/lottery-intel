import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { buildFourDRankings, type RankingAppearance, type RankingPeriod, type Rankings } from "@/lib/fourd-rankings";

type RankingResult = { data: Rankings | null; error: string | null; rowCount: number };

// Supabase/PostgREST caps normal responses, so retrieve the public production view in
// fixed pages. This is one query per archive page—not one query per each of 10,000 numbers.
const loadPublishedAppearances = unstable_cache(async (): Promise<RankingAppearance[]> => {
  const client = createServerClient();
  if (!client) throw new Error("Supabase public credentials are unavailable.");
  const pageSize = 1_000;
  const rows: RankingAppearance[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await client.schema("api_public").from("published_fourd_results")
      .select("winning_number,draw_date,prize_type")
      .order("draw_date", { ascending: true }).order("winning_number", { ascending: true })
      .range(from, from + pageSize - 1);
    if (result.error) throw new Error(result.error.message);
    const page = (result.data ?? []) as RankingAppearance[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}, ["published-4d-ranking-appearances-v1"], { revalidate: 3600, tags: ["4d-rankings"] });

export async function getFourDRankings(period: RankingPeriod): Promise<RankingResult> {
  try {
    const rows = await loadPublishedAppearances();
    return { data: buildFourDRankings(rows, period), error: null, rowCount: rows.length };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unable to load rankings.", rowCount: 0 };
  }
}
