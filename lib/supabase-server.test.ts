import assert from "node:assert/strict";
import test from "node:test";
import { createServerClient } from "./supabase/server.ts";

const variables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

function restoreEnvironment(original: Record<(typeof variables)[number], string | undefined>) {
  for (const variable of variables) {
    if (original[variable] === undefined) delete process.env[variable];
    else process.env[variable] = original[variable];
  }
}

test("returns an unavailable state when Supabase public credentials are missing", () => {
  const original = Object.fromEntries(variables.map((variable) => [variable, process.env[variable]])) as Record<(typeof variables)[number], string | undefined>;
  try {
    for (const variable of variables) delete process.env[variable];
    assert.equal(createServerClient(), null);
  } finally {
    restoreEnvironment(original);
  }
});

test("constructs configured queries against the api_public schema", async () => {
  const originalEnvironment = Object.fromEntries(variables.map((variable) => [variable, process.env[variable]])) as Record<(typeof variables)[number], string | undefined>;
  const originalFetch = globalThis.fetch;
  let request: Request | undefined;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    globalThis.fetch = async (input, init) => {
      request = new Request(input, init);
      return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    };

    const client = createServerClient();
    assert.ok(client);
    const result = await client.schema("api_public").from("published_draws").select("id");

    assert.equal(result.error, null);
    assert.equal(request?.url, "https://example.supabase.co/rest/v1/published_draws?select=id");
    assert.equal(request?.headers.get("accept-profile"), "api_public");
    assert.equal(request?.headers.get("apikey"), "test-anon-key");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnvironment(originalEnvironment);
  }
});
