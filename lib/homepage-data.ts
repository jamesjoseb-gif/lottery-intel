export type DrawRow = {
  draw_id: string; draw_no: string; draw_date: string; published_at: string;
  prize_type: "first" | "second" | "third" | "starter" | "consolation";
  winning_number: string;
};

export type DrawSummary = {
  draw_id: string; draw_no: string; draw_date: string; published_at: string;
  first: string | null; second: string | null; third: string | null;
};

export function summarizeFourDDraws(rows: DrawRow[]): DrawSummary[] {
  const draws = new Map<string, DrawRow[]>();
  for (const row of rows) draws.set(row.draw_id, [...(draws.get(row.draw_id) ?? []), row]);
  return Array.from(draws.values()).map((drawRows) => {
    const draw = drawRows[0];
    return {
      draw_id: draw.draw_id, draw_no: draw.draw_no, draw_date: draw.draw_date, published_at: draw.published_at,
      first: drawRows.find((row) => row.prize_type === "first")?.winning_number ?? null,
      second: drawRows.find((row) => row.prize_type === "second")?.winning_number ?? null,
      third: drawRows.find((row) => row.prize_type === "third")?.winning_number ?? null,
    };
  });
}
