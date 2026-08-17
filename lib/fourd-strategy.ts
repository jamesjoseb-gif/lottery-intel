export type FourDStrategyGoal = "coverage" | "balanced" | "payout";

export type FourDStrategyRules = {
  goal: FourDStrategyGoal;
  label: string;
  systemShare: number;
  exactShare: number;
  explanation: string;
};

export const FOURD_STRATEGY_RULES: Record<FourDStrategyGoal, FourDStrategyRules> = {
  coverage: {
    goal: "coverage",
    label: "Maximum Coverage",
    systemShare: 0.9,
    exactShare: 0.1,
    explanation: "Prioritises unique combination coverage and removes duplicate exposure. Historical signals rank candidates but do not imply higher mathematical draw odds.",
  },
  balanced: {
    goal: "balanced",
    label: "Balanced",
    systemShare: 0.7,
    exactShare: 0.3,
    explanation: "Balances system-family coverage with a smaller set of higher-ranked exact selections.",
  },
  payout: {
    goal: "payout",
    label: "Higher Payout",
    systemShare: 0.35,
    exactShare: 0.65,
    explanation: "Concentrates more of the chosen budget on fewer exact selections while retaining some system-family coverage.",
  },
};

export function normalizeFourDBudget(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(10000, Math.max(10, Math.floor(parsed)));
}

export function allocateFourDBudget(budget: number, goal: FourDStrategyGoal) {
  const normalized = normalizeFourDBudget(budget);
  const rules = FOURD_STRATEGY_RULES[goal];
  const systemBudget = Math.floor(normalized * rules.systemShare);
  return {
    budget: normalized,
    systemBudget,
    exactBudget: normalized - systemBudget,
    rules,
  };
}
