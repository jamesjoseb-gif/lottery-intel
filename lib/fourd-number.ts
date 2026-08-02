/** Normalize user input without ever turning an empty value into `0000`. */
export function normalizeFourDNumber(value: string): string | null {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 0 || digits.length > 4) return null;

  return digits.padStart(4, "0");
}

/** Limit an input field to the four digits that can form a valid 4D number. */
export function sanitizeFourDInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

export type NumberAppearance = {
  draw_date: string;
  prize_type: "first" | "second" | "third" | "starter" | "consolation";
};

const day = 86_400_000;
const dateValue = (value: string) => Date.parse(`${value}T00:00:00Z`);

export function buildNumberHistoryStats(rows: NumberAppearance[], today = new Date()): {
  total: number;
  firstSeen: string | null;
  lastSeen: string | null;
  daysSinceLast: number | null;
  gaps: { average: number | null; shortest: number | null; longest: number | null };
  prizes: Record<NumberAppearance["prize_type"], number>;
  years: Array<[string, number]>;
  months: Array<[string, number]>;
  weekdays: Array<[string, number]>;
} {
  const ordered = [...rows].sort((a, b) => dateValue(a.draw_date) - dateValue(b.draw_date));
  const gaps = ordered.slice(1).map((row, index) => Math.round((dateValue(row.draw_date) - dateValue(ordered[index].draw_date)) / day));
  const countBy = (label: (row: NumberAppearance) => string) => {
    const counts = new Map<string, number>();
    rows.forEach((row) => counts.set(label(row), (counts.get(label(row)) ?? 0) + 1));
    return [...counts].sort(([a], [b]) => a.localeCompare(b));
  };
  const prizes = { first: 0, second: 0, third: 0, starter: 0, consolation: 0 };
  rows.forEach((row) => { prizes[row.prize_type] += 1; });
  const lastSeen = ordered.at(-1)?.draw_date ?? null;
  return {
    total: rows.length,
    firstSeen: ordered[0]?.draw_date ?? null,
    lastSeen,
    daysSinceLast: lastSeen ? Math.max(0, Math.floor((today.getTime() - dateValue(lastSeen)) / day)) : null,
    gaps: {
      average: gaps.length ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) : null,
      shortest: gaps.length ? Math.min(...gaps) : null,
      longest: gaps.length ? Math.max(...gaps) : null,
    },
    prizes,
    years: countBy((row) => row.draw_date.slice(0, 4)).reverse(),
    months: countBy((row) => row.draw_date.slice(0, 7)).reverse(),
    weekdays: countBy((row) => new Intl.DateTimeFormat("en-SG", { weekday: "long", timeZone: "UTC" }).format(new Date(`${row.draw_date}T00:00:00Z`))),
  };
}

export function adjacentFourDNumbers(number: string) {
  const value = Number(number);
  return { previous: String((value + 9_999) % 10_000).padStart(4, "0"), next: String((value + 1) % 10_000).padStart(4, "0") };
}

export function relatedFourDNumbers(number: string): string[] {
  const adjacent = adjacentFourDNumbers(number);
  const candidates = [number.split("").reverse().join(""), number.slice(1) + number[0], number.at(-1)! + number.slice(0, -1), adjacent.previous, adjacent.next];
  return [...new Set(candidates)].filter((candidate) => candidate !== number && /^\d{4}$/.test(candidate)).slice(0, 5);
}
