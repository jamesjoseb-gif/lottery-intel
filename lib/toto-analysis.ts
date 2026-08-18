import { createServerClient } from "@/lib/supabase/server";

export type TotoResearchMode = "match2" | "match3" | "match4" | "standard" | "system";
export type RelationshipScore = {
  numbers: number[];
  score: number;
  countPrimary: number;
  countSecondary?: number;
  rankPrimary: number;
  rankSecondary?: number;
  percentile: number;
};
export type TotoResearchAnalysis = {
  asOf: string;
  mode: TotoResearchMode;
  researchScore: number;
  evidence: "Experimental" | "Moderate evidence" | "High variance";
  strongest: RelationshipScore[];
  weakest: RelationshipScore[];
  numberScores: Array<{ number: number; appearances365: number; appearances90: number; score: number }>;
  suggestedDeployment: number;
  explanation: string;
};

type TotoResultRow = { draw_id: string; draw_date: string; number_kind: "main" | "additional"; winning_number: number };
type DrawSet = { date: string; numbers: number[] };

function combinations(values: number[], size: number): number[][] {
  const out: number[][] = [];
  const walk = (start: number, pick: number[]) => {
    if (pick.length === size) { out.push([...pick]); return; }
    for (let i = start; i <= values.length - (size - pick.length); i++) {
      pick.push(values[i]); walk(i + 1, pick); pick.pop();
    }
  };
  walk(0, []);
  return out;
}

const keyOf = (nums: number[]) => nums.join("-");
const daysBefore = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - days); return d.toISOString().slice(0, 10);
};

function relationshipCounts(draws: DrawSet[], size: number, cutoff: string) {
  const map = new Map<string, number>();
  for (const draw of draws) {
    if (draw.date < cutoff) continue;
    for (const combo of combinations(draw.numbers, size)) {
      const key = keyOf(combo); map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
}

function rankMap(counts: Map<string, number>) {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const ranks = new Map<string, number>();
  sorted.forEach(([key], i) => ranks.set(key, i + 1));
  return { ranks, total: Math.max(sorted.length, 1) };
}

function pctFromRank(rank: number, total: number) {
  return Math.max(0, Math.min(100, Math.round(100 * (1 - (rank - 1) / Math.max(total, 1)))));
}

export async function analyseTotoNumbers(numbers: number[], mode: TotoResearchMode, budget: number): Promise<{ data: TotoResearchAnalysis | null; error: string | null }> {
  try {
    const client = createServerClient();
    if (!client) return { data: null, error: "Supabase public credentials are unavailable." };
    const result = await client.schema("api_public").from("published_toto_results")
      .select("draw_id,draw_date,number_kind,winning_number")
      .eq("number_kind", "main")
      .order("draw_date", { ascending: false })
      .limit(2000);
    if (result.error) return { data: null, error: result.error.message };
    const rows = (result.data ?? []) as TotoResultRow[];
    if (!rows.length) return { data: null, error: "No published TOTO history is available." };

    const asOf = rows[0].draw_date;
    const grouped = new Map<string, DrawSet>();
    for (const row of rows) {
      const current = grouped.get(row.draw_id) ?? { date: row.draw_date, numbers: [] };
      current.numbers.push(row.winning_number); grouped.set(row.draw_id, current);
    }
    const draws = [...grouped.values()].map((d) => ({ ...d, numbers: [...new Set(d.numbers)].sort((a, b) => a - b) }));

    const c365 = daysBefore(asOf, 365), c210 = daysBefore(asOf, 210), c180 = daysBefore(asOf, 180), c90 = daysBefore(asOf, 90);
    const freq365 = new Map<number, number>(), freq90 = new Map<number, number>();
    for (const draw of draws) for (const n of draw.numbers) {
      if (draw.date >= c365) freq365.set(n, (freq365.get(n) ?? 0) + 1);
      if (draw.date >= c90) freq90.set(n, (freq90.get(n) ?? 0) + 1);
    }
    const max365 = Math.max(...freq365.values(), 1), max90 = Math.max(...freq90.values(), 1);
    const numberScores = numbers.map((number) => {
      const a365 = freq365.get(number) ?? 0, a90 = freq90.get(number) ?? 0;
      return { number, appearances365: a365, appearances90: a90, score: Math.round(100 * (0.6 * a365 / max365 + 0.4 * a90 / max90)) };
    }).sort((a, b) => b.score - a.score);

    const size = mode === "match2" ? 2 : mode === "match3" ? 3 : mode === "match4" ? 4 : 1;
    let relationships: RelationshipScore[] = [];
    let evidence: TotoResearchAnalysis["evidence"] = "Moderate evidence";
    let explanation = "Individual-number frequency is supporting context only; larger System pools are not automatically treated as better.";

    if (size > 1) {
      const primaryCutoff = mode === "match2" ? c365 : c180;
      const primary = relationshipCounts(draws, size, primaryCutoff);
      const pRank = rankMap(primary);
      const secondary = mode === "match3" ? relationshipCounts(draws, size, c210) : undefined;
      const sRank = secondary ? rankMap(secondary) : undefined;
      relationships = combinations([...numbers].sort((a, b) => a - b), size).map((combo) => {
        const key = keyOf(combo), countPrimary = primary.get(key) ?? 0;
        const rankPrimary = pRank.ranks.get(key) ?? pRank.total + 1;
        const p1 = pctFromRank(rankPrimary, pRank.total + 1);
        if (!secondary || !sRank) return { numbers: combo, score: p1, countPrimary, rankPrimary, percentile: p1 };
        const countSecondary = secondary.get(key) ?? 0;
        const rankSecondary = sRank.ranks.get(key) ?? sRank.total + 1;
        const p2 = pctFromRank(rankSecondary, sRank.total + 1);
        const stability = Math.max(0, 100 - Math.abs(p1 - p2));
        return { numbers: combo, score: Math.round(0.4 * p1 + 0.4 * p2 + 0.2 * stability), countPrimary, countSecondary, rankPrimary, rankSecondary, percentile: Math.round((p1 + p2) / 2) };
      }).sort((a, b) => b.score - a.score);
      evidence = mode === "match3" ? "Experimental" : mode === "match4" ? "High variance" : "Moderate evidence";
      explanation = mode === "match2" ? "Match 2 prioritises exact pair co-occurrence over the last 365 days." : mode === "match3" ? "Match 3 uses consensus between exact triple relationships over 180 and 210 days, rewarding stability across both windows." : "Match 4 uses exact 180-day quadruple relationships and is labelled high variance because historical wins were rare.";
    }

    const relationshipComponent = relationships.length ? relationships.slice(0, Math.min(5, relationships.length)).reduce((s, r) => s + r.score, 0) / Math.min(5, relationships.length) : numberScores.reduce((s, n) => s + n.score, 0) / Math.max(numberScores.length, 1);
    const researchScore = Math.round(relationshipComponent);
    const baseSpend = mode === "match2" ? Math.min(budget, 5) : mode === "match3" ? Math.min(budget, 25) : mode === "match4" ? Math.min(budget, 10) : Math.min(budget, mode === "system" ? 84 : 20);
    const suggestedDeployment = researchScore < 45 ? Math.min(baseSpend, Math.ceil(budget * 0.2)) : baseSpend;

    return { data: { asOf, mode, researchScore, evidence, strongest: relationships.slice(0, 5), weakest: [...relationships].sort((a, b) => a.score - b.score).slice(0, 3), numberScores, suggestedDeployment, explanation }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unable to analyse TOTO numbers." };
  }
}
