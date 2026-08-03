import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fetchPublishedRows, verifyFourDIntegrity } from "./verify-4d-integrity.mjs";

const permissionMigration = readFileSync(new URL("../supabase/migrations/20260802000400_grant_service_role_fourd_verification_access.sql", import.meta.url), "utf8");

function validRows() {
  return Object.entries({ first: 1, second: 1, third: 1, starter: 10, consolation: 10 }).flatMap(([prize_type, count], typeIndex) =>
    Array.from({ length: count }, (_, index) => ({ draw_id: "draw-1", prize_type, position: index + 1, winning_number: String(typeIndex * 100 + index).padStart(4, "0") })),
  );
}

test("accepts a complete published 4D draw", () => {
  assert.deepEqual(verifyFourDIntegrity(validRows()), { ok: true, drawsChecked: 1, rowsChecked: 23, errors: [] });
});

test("allows a winning number to repeat in different prize slots", () => {
  const rows = validRows(); rows[1].winning_number = rows[0].winning_number;
  assert.equal(verifyFourDIntegrity(rows).ok, true);
});

test("reports missing rows, duplicate positions, and malformed numbers", () => {
  const rows = validRows().slice(1); rows[3].position = rows[2].position; rows[2].winning_number = "123";
  const result = verifyFourDIntegrity(rows);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /expected 23|positions|invalid number/);
});

test("fetches every page from the published 4D view through the api_public profile", async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  try {
    const rows = Array.from({ length: 107 }, (_, index) => ({ draw_id: `draw-${index}` }));
    const pages = [rows.slice(0, 100), rows.slice(100), []];
    const expectedOffsets = ["0", "100", "107"];
    let request = 0;
    const result = await fetchPublishedRows(async (url, options) => {
      const parsedUrl = new URL(url);
      assert.equal(parsedUrl.origin + parsedUrl.pathname, "https://example.supabase.co/rest/v1/published_fourd_results");
      assert.equal(parsedUrl.searchParams.get("select"), "draw_id,draw_no,draw_date,prize_type,position,winning_number");
      assert.equal(parsedUrl.searchParams.get("order"), "draw_id,prize_type,position");
      assert.equal(parsedUrl.searchParams.get("limit"), "1000");
      assert.equal(parsedUrl.searchParams.get("offset"), expectedOffsets[request]);
      assert.deepEqual(options.headers, {
        apikey: "service-role-key",
        authorization: "Bearer service-role-key",
        "Accept-Profile": "api_public",
      });
      return { ok: true, json: async () => pages[request++] };
    });
    assert.deepEqual(result, rows);
    assert.equal(request, 3);
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});

test("grants the service verifier its view and security-invoker dependencies", () => {
  assert.match(permissionMigration, /grant select on api_public\.published_fourd_results to service_role;/i);
  assert.match(permissionMigration, /grant select \(revision_id, prize_type, position, winning_number\)\s+on public\.fourd_results to service_role;/i);
  assert.doesNotMatch(permissionMigration, /^\s*(?:alter table|create policy|grant .* to (?:anon|authenticated))\b/im);
});
