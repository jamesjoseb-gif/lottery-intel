import { getFourDRankings } from "@/lib/fourd-rankings-data";
import { buildFourDStrategyPlan, type FourDCandidate, type FourDStrategyGoal, type FourDStrategyPlan } from "@/lib/fourd-strategy-optimizer";

function uniquePermutations(value: string): string[] {
  const chars = value.split("").sort();
  const result = new Set<string>();
  const used = Array(chars.length).fill(false);
  const current: string[] = [];
  const visit = () => {
    if (current.length === chars.length) { result.add(current.join("")); return; }
    for (let i = 0; i < chars.length; i += 1) {
      if (used[i]) continue;
      if (i > 0 && chars[i] === chars[i - 1] && !used[i - 1]) continue;
      used[i] = true; current.push(chars[i]); visit(); current.pop(); used[i] = false;
    }
  };
  visit();
  return [...result];
}

export async function getFourDStrategyPlan(budget: number, goal: FourDStrategyGoal): Promise<{ data: FourDStrategyPlan | null; error: string | null }> {
  const rankings = await getFourDRankings("365");
  if (rankings.error || !rankings.data) return { data: null, error: rankings.error ?? "Ranking data is unavailable." };

  const source = [...rankings.data.hot, ...rankings.data.overdue];
  const exactMap = new Map<string, FourDCandidate>();
  const familyMap = new Map<string, { score: number; representative: string }>();

  for (const item of source) {
    const score = item.historicalActivityScore;
    const existing = exactMap.get(item.number);
    if (!existing || score > existing.intelligenceScore) exactMap.set(item.number, { number: item.number, intelligenceScore: score });
    const family = item.number.split("").sort().join("");
    const current = familyMap.get(family);
    if (!current || score > current.score) familyMap.set(family, { score, representative: item.number });
  }

  const systems: FourDCandidate[] = [...familyMap.entries()].map(([family, item]) => ({
    number: item.representative,
    family,
    intelligenceScore: item.score,
    permutations: uniquePermutations(family),
  }));

  return { data: buildFourDStrategyPlan(budget, goal, systems, [...exactMap.values()]), error: null };
}
