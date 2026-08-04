import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("rankings loader calls the versioned public RPC with bounded arguments", () => {
  const source = readFileSync(new URL("./fourd-rankings-data.ts", import.meta.url), "utf8");
  assert.match(source, /schema\("api_public"\)\.rpc\("get_fourd_rankings", \{ p_period: period, p_limit: 50 \}\)/);
  assert.doesNotMatch(source, /from\("published_fourd_results"\)/);
});

test("rankings migration creates and grants the RPC", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260804000100_add_fourd_rankings_rpc.sql", import.meta.url), "utf8");
  assert.match(migration, /create or replace function api_public\.get_fourd_rankings/);
  assert.match(migration, /grant execute on function api_public\.get_fourd_rankings\(text, integer\) to anon, authenticated/);
});
