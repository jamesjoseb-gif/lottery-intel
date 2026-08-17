export type FourDStrategyGoal = "coverage" | "balanced" | "payout";

export type FourDCandidate = {
  number: string;
  intelligenceScore: number;
  family?: string;
  permutations?: string[];
};

export type FourDPlanLine = {
  kind: "system" | "exact";
  label: string;
  numbers: string[];
  stake: number;
  cost: number;
  intelligenceScore: number;
};

export type FourDStrategyPlan = {
  budget: number;
  goal: FourDStrategyGoal;
  spent: number;
  unallocated: number;
  uniqueNumbersCovered: number;
  coverageEfficiency: number;
  lines: FourDPlanLine[];
  confidence: "strong" | "moderate" | "weak" | "no-distinction";
  explanation: string;
};

const clampBudget = (budget: number) => Math.max(1, Math.min(10000, Math.floor(budget)));

/**
 * V1 is deliberately a buying-strategy optimiser, not a probability predictor.
 * Historical Intelligence ranks/tie-breaks candidates; the optimiser's primary
 * job is to use a chosen budget efficiently while avoiding duplicate coverage.
 */
export function buildFourDStrategyPlan(
  rawBudget: number,
  goal: FourDStrategyGoal,
  systemCandidates: FourDCandidate[],
  exactCandidates: FourDCandidate[],
): FourDStrategyPlan {
  const budget = clampBudget(rawBudget);
  const systemShare = goal === "coverage" ? 0.9 : goal === "balanced" ? 0.65 : 0.25;
  const systemBudget = Math.floor(budget * systemShare);
  const covered = new Set<string>();
  const lines: FourDPlanLine[] = [];
  let spent = 0;

  const systems = [...systemCandidates]
    .filter((c) => c.permutations?.length)
    .sort((a, b) => {
      const av = (a.intelligenceScore + 25) / Math.max(1, a.permutations!.length);
      const bv = (b.intelligenceScore + 25) / Math.max(1, b.permutations!.length);
      return bv - av || b.intelligenceScore - a.intelligenceScore;
    });

  for (const candidate of systems) {
    const unique = [...new Set(candidate.permutations!)].filter((n) => !covered.has(n));
    if (!unique.length) continue;
    // $1 Big-equivalent per unique covered permutation in V1.
    const cost = unique.length;
    if (spent + cost > systemBudget) continue;
    unique.forEach((n) => covered.add(n));
    spent += cost;
    lines.push({ kind: "system", label: candidate.family ?? candidate.number, numbers: unique, stake: 1, cost, intelligenceScore: candidate.intelligenceScore });
  }

  const exacts = [...exactCandidates].sort((a, b) => b.intelligenceScore - a.intelligenceScore || a.number.localeCompare(b.number));
  for (const candidate of exacts) {
    if (spent >= budget) break;
    if (covered.has(candidate.number)) continue;
    covered.add(candidate.number);
    spent += 1;
    lines.push({ kind: "exact", label: candidate.number, numbers: [candidate.number], stake: 1, cost: 1, intelligenceScore: candidate.intelligenceScore });
  }

  const scores = lines.map((line) => line.intelligenceScore);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const confidence = avgScore >= 80 ? "strong" : avgScore >= 65 ? "moderate" : avgScore >= 50 ? "weak" : "no-distinction";
  const uniqueNumbersCovered = covered.size;
  const coverageEfficiency = spent ? Math.round((uniqueNumbersCovered / spent) * 100) / 100 : 0;

  return {
    budget,
    goal,
    spent,
    unallocated: budget - spent,
    uniqueNumbersCovered,
    coverageEfficiency,
    lines,
    confidence,
    explanation: confidence === "no-distinction"
      ? "No meaningful historical distinction was detected. This plan is therefore optimised primarily for budget coverage and low duplication."
      : "Historical Intelligence is used to rank candidates, while budget coverage and duplicate removal determine the buying plan. Historical patterns do not guarantee future results.",
  };
}
