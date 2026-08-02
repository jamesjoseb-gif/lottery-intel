import { createServerClient } from "@/lib/supabase/server";
import { summarizeFourDDraws, type DrawSummary } from "@/lib/homepage-data";

export type DrawInfo = { draw_id: string; draw_no: string; draw_date: string; published_at: string };
export type FourDRow = DrawInfo & { prize_type: "first" | "second" | "third" | "starter" | "consolation"; position: number; winning_number: string };
export type TotoRow = DrawInfo & { number_kind: "main" | "additional"; position: number; winning_number: number };
export type SweepRow = DrawInfo & { tier_code: string; source_label: string; position: number; ticket_number: string; series: string | null; entry_suffix: string | null; source_display_value: string };
export type FourDStatistic = { winning_number: string; appearances: number; first_prizes: number; second_prizes: number; third_prizes: number; starter_prizes: number; consolation_prizes: number; last_seen_on: string };
export type FourDDrawSummary = DrawSummary;
export type CoveragePeriod = { firstDate: string; lastDate: string };

type QueryResult<T> = { data: T; error: null } | { data: null; error: string };

async function safely<T>(query: () => PromiseLike<{ data: T | null; error: { message: string } | null }>, fallback: T): Promise<QueryResult<T>> {
  try {
    const { data, error } = await query();
    if (error) return { data: null, error: error.message };
    return { data: data ?? fallback, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unable to load results." };
  }
}

function publicView(name: string) {
  return createServerClient().schema("api_public").from(name);
}

export function getLatestFourD() {
  return getLatestRows<FourDRow>("4d", "published_fourd_results");
}

export function getLatestToto() {
  return getLatestRows<TotoRow>("toto", "published_toto_results");
}

export function getLatestSweep() {
  return getLatestRows<SweepRow>("sweep", "published_sweep_results");
}

async function getLatestRows<T>(game: "4d" | "toto" | "sweep", view: string): Promise<QueryResult<T[]>> {
  const latest = await safely<{ id: string }[]>(() => publicView("published_draws").select("id").eq("game_code", game).order("draw_date", { ascending: false }).order("draw_no", { ascending: false }).limit(1), []);
  if (!latest.data) return { data: null, error: latest.error };
  if (!latest.data[0]) return { data: [], error: null };
  return safely<T[]>(() => publicView(view).select("*").eq("draw_id", latest.data[0].id).order("position"), []);
}

export function getNumberHistory(number: string) {
  return safely<FourDRow[]>(() => publicView("published_fourd_results").select("*").eq("winning_number", number).order("draw_date", { ascending: false }), []);
}

export function getFourDStatistics(limit = 50) {
  return safely<FourDStatistic[]>(
    () => publicView("fourd_number_statistics").select("*").order("appearances", { ascending: false }).order("last_seen_on", { ascending: false }).order("winning_number").limit(limit),
    [],
  );
}

export async function getRecentFourDDraws(limit = 5): Promise<QueryResult<FourDDrawSummary[]>> {
  const result = await safely<FourDRow[]>(
    () => publicView("published_fourd_results").select("*").order("draw_date", { ascending: false }).order("draw_no", { ascending: false }).order("position").limit(Math.max(limit, 1) * 23),
    [],
  );
  if (!result.data) return result;
  return { data: summarizeFourDDraws(result.data).slice(0, limit), error: null };
}

export async function getFourDCoverage(): Promise<QueryResult<CoveragePeriod | null>> {
  const [oldest, newest] = await Promise.all([
    safely<{ draw_date: string }[]>(() => publicView("published_draws").select("draw_date").eq("game_code", "4d").order("draw_date").limit(1), []),
    safely<{ draw_date: string }[]>(() => publicView("published_draws").select("draw_date").eq("game_code", "4d").order("draw_date", { ascending: false }).limit(1), []),
  ]);
  if (!oldest.data) return { data: null, error: oldest.error };
  if (!newest.data) return { data: null, error: newest.error };
  if (!oldest.data[0] || !newest.data[0]) return { data: null, error: null };
  return { data: { firstDate: oldest.data[0].draw_date, lastDate: newest.data[0].draw_date }, error: null };
}

export function formatDrawDate(date: string) {
  return new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" }).format(new Date(`${date}T00:00:00+08:00`));
}
