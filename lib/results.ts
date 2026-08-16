import { createServerClient } from "@/lib/supabase/server";
import { summarizeFourDDraws, type DrawSummary } from "@/lib/homepage-data";
import { groupRowsByDraw, normalizePage } from "@/lib/archive-data";
export { groupRowsByDraw, groupSweepTiers, normalizePage } from "@/lib/archive-data";

export type GameCode = "4d" | "toto" | "sweep";
export type DrawInfo = { draw_id: string; draw_no: string; draw_date: string; published_at: string };
export type PublishedDraw = { id: string; game_code: GameCode; draw_no: string; draw_date: string; published_at: string };
export type FourDRow = DrawInfo & { prize_type: "first" | "second" | "third" | "starter" | "consolation"; position: number | null; winning_number: string };
export type TotoRow = DrawInfo & { number_kind: "main" | "additional"; position: number; winning_number: number };
export type SweepRow = DrawInfo & { tier_code: string; source_label: string; position: number; ticket_number: string; series: string | null; entry_suffix: string | null; source_display_value: string };
export type FourDStatistic = { winning_number: string; appearances: number; first_prizes: number; second_prizes: number; third_prizes: number; starter_prizes: number; consolation_prizes: number; last_seen_on: string };
export type FourDDrawSummary = DrawSummary;
export type Coverage = { firstDate: string; lastDate: string; count: number; latest: PublishedDraw };
export type Archive<T> = { draws: Array<{ draw: PublishedDraw; rows: T[] }>; count: number; page: number; pageSize: number };
type QueryResult<T> = { data: T; error: null } | { data: null; error: string };

async function safely<T>(query: () => PromiseLike<{ data: T | null; error: { message: string } | null }>, fallback: T): Promise<QueryResult<T>> {
  try { const { data, error } = await query(); if (error) return { data: null, error: error.message }; return { data: data ?? fallback, error: null }; }
  catch (error) { return { data: null, error: error instanceof Error ? error.message : "Unable to load results." }; }
}
function publicView(name: string) {
  const client = createServerClient();
  if (!client) throw new Error("Supabase public credentials are unavailable.");
  return client.schema("api_public").from(name);
}
const resultView = { "4d": "published_fourd_results", toto: "published_toto_results", sweep: "published_sweep_results" } as const;

export async function getCoverage(game: GameCode): Promise<QueryResult<Coverage | null>> {
  try {
    const fields = "id,game_code,draw_no,draw_date,published_at";
    const [countResult, latestResult, oldestResult] = await Promise.all([
      publicView("published_draws").select("id", { count: "exact", head: true }).eq("game_code", game),
      publicView("published_draws").select(fields).eq("game_code", game).order("draw_date", { ascending: false }).order("draw_no", { ascending: false }).limit(1),
      publicView("published_draws").select("draw_date").eq("game_code", game).order("draw_date").limit(1),
    ]);
    const error = countResult.error ?? latestResult.error ?? oldestResult.error;
    if (error) return { data: null, error: error.message };
    const latest = (latestResult.data?.[0] as PublishedDraw | undefined);
    const oldest = oldestResult.data?.[0] as { draw_date: string } | undefined;
    if (!latest || !oldest) return { data: null, error: null };
    return { data: { firstDate: oldest.draw_date, lastDate: latest.draw_date, count: countResult.count ?? 0, latest }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unable to load coverage." };
  }
}

export async function getArchive<T extends DrawInfo>(game: GameCode, filters: { date?: string; draw?: string; page?: string }, pageSize = 10): Promise<QueryResult<Archive<T>>> {
  const page = normalizePage(filters.page);
  try {
    let query = publicView("published_draws").select("id,game_code,draw_no,draw_date,published_at", { count: "exact" }).eq("game_code", game);
    if (filters.date) query = query.eq("draw_date", filters.date);
    if (filters.draw?.trim()) query = query.ilike("draw_no", `%${filters.draw.trim()}%`);
    const from = (page - 1) * pageSize;
    const drawResult = await query.order("draw_date", { ascending: false }).order("draw_no", { ascending: false }).range(from, from + pageSize - 1);
    if (drawResult.error) return { data: null, error: drawResult.error.message };
    const draws = (drawResult.data ?? []) as PublishedDraw[];
    if (!draws.length) return { data: { draws: [], count: drawResult.count ?? 0, page, pageSize }, error: null };
    const rowResult = await publicView(resultView[game]).select("*").in("draw_id", draws.map((draw) => draw.id)).order("position");
    if (rowResult.error) return { data: null, error: rowResult.error.message };
    return { data: { draws: groupRowsByDraw(draws, (rowResult.data ?? []) as T[]), count: drawResult.count ?? draws.length, page, pageSize }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unable to load archive." };
  }
}

export async function getDraw<T extends DrawInfo>(game: GameCode, drawNo: string): Promise<QueryResult<{ draw: PublishedDraw; rows: T[] } | null>> {
  const drawResult = await safely<PublishedDraw[]>(() => publicView("published_draws").select("id,game_code,draw_no,draw_date,published_at").eq("game_code", game).eq("draw_no", drawNo).limit(1), []);
  if (!drawResult.data) return drawResult;
  const draw = drawResult.data[0]; if (!draw) return { data: null, error: null };
  const rows = await safely<T[]>(() => publicView(resultView[game]).select("*").eq("draw_id", draw.id).order("position"), []);
  return rows.data ? { data: { draw, rows: rows.data }, error: null } : rows;
}

async function getLatestRows<T>(game: GameCode): Promise<QueryResult<T[]>> { const archive = await getArchive<DrawInfo>(game, {}, 1); if (!archive.data) return archive; return { data: (archive.data.draws[0]?.rows ?? []) as T[], error: null }; }
export function getLatestFourD() { return getLatestRows<FourDRow>("4d"); }
export function getLatestToto() { return getLatestRows<TotoRow>("toto"); }
export function getLatestSweep() { return getLatestRows<SweepRow>("sweep"); }
export type NumberHistory = { appearances: FourDRow[]; rows: FourDRow[]; count: number; page: number; pageSize: number; archiveCounts: { total: number; last12Months: number; last24Months: number } };

/** Fetch the published 4D archive fields needed for digit-position analysis. */
export async function getFourDDigitPositionRows(): Promise<QueryResult<Array<{ winning_number: string; draw_date: string }>>> {
  return safely<Array<{ winning_number: string; draw_date: string }>>(
    () => publicView("published_fourd_results").select("winning_number,draw_date").order("draw_date", { ascending: false }).limit(10000),
    [],
  );
}

/** Fetch an exact number's complete history for statistics and a filtered page for display. */
export async function getNumberHistory(number: string, filters: { year?: string; prize?: string; page?: string } = {}, pageSize = 20): Promise<QueryResult<NumberHistory>> {
  const page = normalizePage(filters.page);
  try {
    const fields = "draw_id,draw_date,draw_no,prize_type,position,winning_number,published_at";
    const now = new Date();
    const cutoff = (months: number) => { const date = new Date(now); date.setUTCMonth(date.getUTCMonth() - months); return date.toISOString().slice(0, 10); };
    const allQuery = publicView("published_fourd_results").select(fields).eq("winning_number", number).order("draw_date", { ascending: false }).order("draw_no", { ascending: false });
    let pageQuery = publicView("published_fourd_results").select(fields, { count: "exact" }).eq("winning_number", number);
    if (/^\d{4}$/.test(filters.year ?? "")) pageQuery = pageQuery.gte("draw_date", `${filters.year}-01-01`).lte("draw_date", `${filters.year}-12-31`);
    if (["first", "second", "third", "starter", "consolation"].includes(filters.prize ?? "")) pageQuery = pageQuery.eq("prize_type", filters.prize!);
    const from = (page - 1) * pageSize;
    const [allResult, pageResult, totalResult, recent12Result, recent24Result] = await Promise.all([
      allQuery,
      pageQuery.order("draw_date", { ascending: false }).order("draw_no", { ascending: false }).range(from, from + pageSize - 1),
      publicView("published_fourd_results").select("draw_id", { count: "exact", head: true }),
      publicView("published_fourd_results").select("draw_id", { count: "exact", head: true }).gte("draw_date", cutoff(12)),
      publicView("published_fourd_results").select("draw_id", { count: "exact", head: true }).gte("draw_date", cutoff(24)),
    ]);
    const error = allResult.error ?? pageResult.error ?? totalResult.error ?? recent12Result.error ?? recent24Result.error;
    if (error) return { data: null, error: error.message };
    return { data: { appearances: (allResult.data ?? []) as FourDRow[], rows: (pageResult.data ?? []) as FourDRow[], count: pageResult.count ?? 0, page, pageSize, archiveCounts: { total: totalResult.count ?? 0, last12Months: recent12Result.count ?? 0, last24Months: recent24Result.count ?? 0 } }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unable to load number history." };
  }
}
export function getFourDStatistics(limit = 50) { return safely<FourDStatistic[]>(() => publicView("fourd_number_statistics").select("*").order("appearances", { ascending: false }).order("last_seen_on", { ascending: false }).order("winning_number").limit(limit), []); }
export async function getRecentFourDDraws(limit = 5): Promise<QueryResult<FourDDrawSummary[]>> { const result = await safely<FourDRow[]>(() => publicView("published_fourd_results").select("*").order("draw_date", { ascending: false }).order("draw_no", { ascending: false }).order("position").limit(Math.max(limit, 1) * 23), []); if (!result.data) return result; return { data: summarizeFourDDraws(result.data).slice(0, limit), error: null }; }
export async function getFourDCoverage() { const coverage = await getCoverage("4d"); return coverage.data ? { data: { firstDate: coverage.data.firstDate, lastDate: coverage.data.lastDate }, error: null as null } : coverage; }
export function formatDrawDate(date: string) { return new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" }).format(new Date(`${date}T00:00:00+08:00`)); }
