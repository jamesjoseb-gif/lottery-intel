import type { ActivityLabel, PrizeType } from "./number-intelligence.ts";

export const luckyModes = ["ordered", "consecutive"] as const;
export const luckySorts = ["score", "appearances", "recent", "absent", "number"] as const;
export type LuckyMode = (typeof luckyModes)[number];
export type LuckySort = (typeof luckySorts)[number];

export type LuckyNumberResult = {
  winning_number: string;
  historical_activity_score: number;
  activity_label: ActivityLabel;
  total_appearances: number;
  last_appearance: string;
  days_since_last_appearance: number;
  average_gap: number | null;
  most_common_prize: PrizeType;
  appearances_last_12_months: number;
  appearances_last_24_months: number;
};

export type LuckySearch = { digits: string; mode: LuckyMode; sort: LuckySort; valid: boolean; error: string | null };

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export function parseLuckySearch(params: { digits?: string | string[]; mode?: string | string[]; sort?: string | string[] }): LuckySearch {
  const digits = first(params.digits)?.trim() ?? "";
  const modeValue = first(params.mode);
  const sortValue = first(params.sort);
  const mode: LuckyMode = luckyModes.includes(modeValue as LuckyMode) ? modeValue as LuckyMode : "ordered";
  const sort: LuckySort = luckySorts.includes(sortValue as LuckySort) ? sortValue as LuckySort : "score";
  if (!digits) return { digits, mode, sort, valid: false, error: null };
  if (!/^\d{1,4}$/.test(digits)) return { digits, mode, sort, valid: false, error: "Enter 1 to 4 digits only." };
  return { digits, mode, sort, valid: true, error: null };
}

export function numberMatches(number: string, digits: string, mode: LuckyMode): boolean {
  if (!/^\d{4}$/.test(number) || !/^\d{1,4}$/.test(digits)) return false;
  if (mode === "consecutive") return number.includes(digits);
  let position = 0;
  for (const digit of number) if (digit === digits[position]) position += 1;
  return position === digits.length;
}

export function sortLuckyResults(rows: LuckyNumberResult[], sort: LuckySort, limit = 100): LuckyNumberResult[] {
  const numberTie = (a: LuckyNumberResult, b: LuckyNumberResult) => a.winning_number.localeCompare(b.winning_number);
  const compare = (a: LuckyNumberResult, b: LuckyNumberResult) => {
    if (sort === "appearances") return b.total_appearances - a.total_appearances || b.historical_activity_score - a.historical_activity_score || numberTie(a, b);
    if (sort === "recent") return b.last_appearance.localeCompare(a.last_appearance) || b.total_appearances - a.total_appearances || numberTie(a, b);
    if (sort === "absent") return b.days_since_last_appearance - a.days_since_last_appearance || b.total_appearances - a.total_appearances || numberTie(a, b);
    if (sort === "number") return numberTie(a, b);
    return b.historical_activity_score - a.historical_activity_score || b.total_appearances - a.total_appearances || numberTie(a, b);
  };
  const unique = new Map(rows.filter((row) => numberMatches(row.winning_number, row.winning_number, "consecutive")).map((row) => [row.winning_number, row]));
  return [...unique.values()].sort(compare).slice(0, Math.max(0, Math.min(100, Math.floor(limit))));
}

export async function runLuckyQuery(loader: () => Promise<LuckyNumberResult[]>): Promise<{ data: LuckyNumberResult[]; error: string | null }> {
  try {
    return { data: await loader(), error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Unable to search published 4D data." };
  }
}
