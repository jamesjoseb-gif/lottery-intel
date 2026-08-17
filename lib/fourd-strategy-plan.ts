import type { RankedNumber } from "@/lib/fourd-rankings";
import { allocateFourDBudget, type FourDStrategyGoal } from "@/lib/fourd-strategy";

export type SystemFamilyPick = {
  family: string;
  representative: string;
  permutations: string[];
  cost: number;
  intelligence: number;
};

export type ExactPick = { number: string; intelligence: number; cost: number };

export type FourDStrategyPlan = {
  budget: number;
  goal: FourDStrategyGoal;
  systemPicks: SystemFamilyPick[];
  exactPicks: ExactPick[];
  systemSpend: number;
  exactSpend: number;
  totalSpend: number;
  uniqueNumbersCovered: number;
  overlapRemoved: number;
  coverageEfficiency: number;
};

function canonicalFamily(number: string) {
  return [...number].sort().join("");
}

function uniquePermutations(value: string) {
  const result = new Set<string>();
  const chars = [...value];
  const walk = (prefix: string, remaining: string[]) => {
    if (!remaining.length) { result.add(prefix); return; }
    const used = new Set<string>();
    remaining.forEach((digit, index) => {
      if (used.has(digit)) return;
      used.add(digit);
      walk(prefix + digit, [...remaining.slice(0, index), ...remaining.slice(index + 1)]);
    });
  };
  walk("", chars);
  return [...result].sort();
}

/**
 * V1 budget optimiser. It treats each system permutation as a $1 Big line,
 * ranks digit families by historical intelligence per line of coverage, then
 * fills unused budget with high-ranked exact $1 Big selections. Historical
 * intelligence is descriptive and is not a probability forecast.
 */
export function buildFourDStrategyPlan(rows: RankedNumber[], budget: number, goal: FourDStrategyGoal): FourDStrategyPlan {
  const allocation = allocateFourDBudget(budget, goal);
  const valid = rows.filter((row) => /^\d{4}$/.test(row.number));
  const byFamily = new Map<string, RankedNumber[]>();
  valid.forEach((row) => {
    const family = canonicalFamily(row.number);
    byFamily.set(family, [...(byFamily.get(family) ?? []), row]);
  });

  const families = [...byFamily.entries()].map(([family, members]) => {
    const permutations = uniquePermutations(family);
    const intelligence = members.reduce((sum, item) => sum + item.historicalActivityScore, 0) / members.length;
    const representative = [...members].sort((a, b) => b.historicalActivityScore - a.historicalActivityScore || a.number.localeCompare(b.number))[0].number;
    return { family, representative, permutations, cost: permutations.length, intelligence };
  }).sort((a, b) => (b.intelligence / b.cost) - (a.intelligence / a.cost) || b.intelligence - a.intelligence || a.family.localeCompare(b.family));

  const systemPicks: SystemFamilyPick[] = [];
  const covered = new Set<string>();
  let systemSpend = 0;
  let overlapRemoved = 0;
  for (const family of families) {
    if (systemSpend + family.cost > allocation.systemBudget) continue;
    const fresh = family.permutations.filter((number) => !covered.has(number));
    overlapRemoved += family.permutations.length - fresh.length;
    if (!fresh.length) continue;
    systemPicks.push({ ...family, permutations: fresh, cost: fresh.length });
    fresh.forEach((number) => covered.add(number));
    systemSpend += fresh.length;
  }

  const exactBudget = allocation.budget - systemSpend;
  const exactPicks: ExactPick[] = [];
  for (const row of [...valid].sort((a, b) => b.historicalActivityScore - a.historicalActivityScore || b.periodAppearances - a.periodAppearances || a.number.localeCompare(b.number))) {
    if (exactPicks.length >= exactBudget) break;
    if (covered.has(row.number)) { overlapRemoved += 1; continue; }
    exactPicks.push({ number: row.number, intelligence: row.historicalActivityScore, cost: 1 });
    covered.add(row.number);
  }

  const exactSpend = exactPicks.length;
  const totalSpend = systemSpend + exactSpend;
  return {
    budget: allocation.budget,
    goal,
    systemPicks,
    exactPicks,
    systemSpend,
    exactSpend,
    totalSpend,
    uniqueNumbersCovered: covered.size,
    overlapRemoved,
    coverageEfficiency: totalSpend ? covered.size / totalSpend : 0,
  };
}
