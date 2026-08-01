import test from "node:test"; import assert from "node:assert/strict"; import { readFileSync } from "node:fs";
import { discoverSweepDraws, parseSweepDraw, validateSweepDraw } from "./import-sweep.mjs";
const fixture = readFileSync(new URL("fixtures/sweep-valid.html", import.meta.url), "utf8");
test("discovers official Big Sweep entries", () => assert.equal(discoverSweepDraws(`<option queryString='sppl=abc' value='1092'>Wed, 01 Jul 2026</option>`)[0].drawNo, "1092"));
test("parses every tier and preserves leading zeroes and suffix", () => { const d=parseSweepDraw(fixture,"official","1092"); assert.equal(d.results.length,5); assert.equal(d.results[0].ticket_number,"0006428"); assert.equal(d.results[0].entry_suffix,"6428"); assert.equal(d.results[4].ticket_number,"0000042"); });
test("rejects a missing top tier", () => assert.throws(() => parseSweepDraw(fixture.replace('class="valueThirdPrize"','class="changed"'),"official"), /Missing required third/));
test("rejects empty or malformed rows", () => assert.equal(validateSweepDraw({drawNo:"1",drawDate:"2026-01-01",results:[{tier_code:"first",source_label:"",position:1,ticket_number:"",source_display_value:""}]}).ok,false));
test("rejects page-not-found and changed layouts", () => { assert.throws(()=>parseSweepDraw("Page not found","official"),/Page not found/); assert.throws(()=>parseSweepDraw("Draw No. 1 Wed, 01 Jul 2026","official"),/Missing required/); });
