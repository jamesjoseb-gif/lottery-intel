export type ArchiveDraw = { id: string; game_code: "4d" | "toto" | "sweep"; draw_no: string; draw_date: string; published_at: string };
export type ArchiveRow = { draw_id: string };
export function groupRowsByDraw<T extends ArchiveRow>(draws: ArchiveDraw[], rows: T[]) { return draws.map((draw) => ({ draw, rows: rows.filter((row) => row.draw_id === draw.id) })); }
export function groupSweepTiers<T extends { tier_code: string; source_label: string }>(rows: T[]) { const groups = new Map<string, { label: string; rows: T[] }>(); for (const row of rows) { const current = groups.get(row.tier_code); if (current) current.rows.push(row); else groups.set(row.tier_code, { label: row.source_label, rows: [row] }); } return Array.from(groups, ([code, value]) => ({ code, ...value })); }
export function normalizePage(value?: string) { const page = Number.parseInt(value ?? "1", 10); return Number.isFinite(page) && page > 0 ? page : 1; }
