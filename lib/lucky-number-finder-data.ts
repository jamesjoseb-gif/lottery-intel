import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { runLuckyQuery, sortLuckyResults, type LuckyMode, type LuckyNumberResult, type LuckySort } from "@/lib/lucky-number-finder";

export type LuckyDataResult = { data: LuckyNumberResult[]; error: string | null };
type Loader = (digits: string, mode: LuckyMode, sort: LuckySort) => Promise<LuckyNumberResult[]>;

const loadLuckyNumbers: Loader = unstable_cache(async (digits, mode, sort) => {
  const client = createServerClient();
  if (!client) throw new Error("Supabase public credentials are unavailable.");
  const result = await client.schema("api_public").rpc("find_lucky_fourd_numbers", {
    p_digits: digits, p_mode: mode, p_sort: sort, p_limit: 100,
  });
  if (result.error) throw new Error(result.error.message);
  return sortLuckyResults((result.data ?? []) as LuckyNumberResult[], sort);
}, ["lucky-number-finder-rpc-v1"], { revalidate: 3600, tags: ["4d-lucky-finder"] });

export async function getLuckyNumberMatches(digits: string, mode: LuckyMode, sort: LuckySort, loader: Loader = loadLuckyNumbers): Promise<LuckyDataResult> {
  return runLuckyQuery(() => loader(digits, mode, sort));
}
