export type DigitPositionRow = { winning_number: string; draw_date: string };

export type DigitPositionInsight = {
  position: 1 | 2 | 3 | 4;
  digit: string;
  totalCount: number;
  totalRate: number;
  recentCount: number;
  recentRate: number;
  expectedRate: number;
  historicalIndex: number;
  recentIndex: number;
};

const EXPECTED_RATE = 0.1;

/**
 * Analyse each digit of an exact 4D number against the same position in
 * published historical results. This describes past frequency only and is
 * deliberately separate from predictive scoring.
 */
export function buildDigitPositionAnalysis(
  number: string,
  rows: DigitPositionRow[],
  options: { asOf?: Date; recentMonths?: number } = {},
): DigitPositionInsight[] {
  if (!/^\d{4}$/.test(number)) return [];
  const asOf = options.asOf ?? new Date();
  const recentMonths = Math.max(1, options.recentMonths ?? 12);
  const cutoff = new Date(asOf);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - recentMonths);
  const validRows = rows.filter((row) => /^\d{4}$/.test(row.winning_number));
  const recentRows = validRows.filter((row) => Date.parse(`${row.draw_date}T00:00:00Z`) >= cutoff.getTime());

  return ([0, 1, 2, 3] as const).map((index) => {
    const digit = number[index];
    const totalCount = validRows.filter((row) => row.winning_number[index] === digit).length;
    const recentCount = recentRows.filter((row) => row.winning_number[index] === digit).length;
    const totalRate = validRows.length ? totalCount / validRows.length : 0;
    const recentRate = recentRows.length ? recentCount / recentRows.length : 0;
    return {
      position: (index + 1) as 1 | 2 | 3 | 4,
      digit,
      totalCount,
      totalRate,
      recentCount,
      recentRate,
      expectedRate: EXPECTED_RATE,
      historicalIndex: EXPECTED_RATE ? totalRate / EXPECTED_RATE : 0,
      recentIndex: EXPECTED_RATE ? recentRate / EXPECTED_RATE : 0,
    };
  });
}
