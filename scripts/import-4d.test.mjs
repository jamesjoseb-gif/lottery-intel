import test from "node:test";
import assert from "node:assert/strict";
import { checksum, discoverDrawUrls, parseDraw } from "./import-4d.mjs";

const nums = (from, count) => Array.from({ length: count }, (_, i) => String(from + i).padStart(4, "0")).join(" </b><b> ");
const fixture = `<h1>Draw No. 5000</h1><p>Draw Date: 01 Jul 2026</p>
  <h2>1st Prize</h2><b>0001</b><h2>2nd Prize</h2><b>0002</b><h2>3rd Prize</h2><b>0003</b>
  <h2>Starter Prizes</h2><b>${nums(10, 10)}</b><h2>Consolation Prizes</h2><b>${nums(20, 10)}</b><p>Prizes not claimed</p>`;

const currentMarkupFixture = `<div draw-date="26 Jul 2026"><span>5514</span></div>
  <table><tbody><tr>${Array.from({ length: 23 }, (_, i) => `<td>${String(i).padStart(4, "0")}</td>`).join("")}</tr></tbody></table>`;

test("builds current Singapore Pools result URLs from archive draw values", () => {
  assert.deepEqual(discoverDrawUrls(`<option value="5514">5514</option><option value="5514">duplicate</option>`),
    ["https://www.singaporepools.com.sg/en/product/Pages/4d_results.aspx?sppl=RHJhd051bWJlcj01NTE0"]);
});

test("parses all 23 values as four-character strings", () => {
  const draw = parseDraw(fixture);
  assert.equal(draw.drawNo, "5000"); assert.equal(draw.drawDate, "2026-07-01");
  assert.equal(draw.results.length, 23); assert.equal(draw.results[0].winning_number, "0001");
  assert.match(checksum(draw), /^[0-9a-f]{64}$/);
});

test("parses draw number from current sppl result URL", () => {
  const draw = parseDraw(currentMarkupFixture, "https://www.singaporepools.com.sg/en/product/Pages/4d_results.aspx?sppl=RHJhd051bWJlcj01NTE0");
  assert.equal(draw.drawNo, "5514"); assert.equal(draw.drawDate, "2026-07-26");
  assert.deepEqual(draw.results.map(({ winning_number }) => winning_number),
    Array.from({ length: 23 }, (_, i) => String(i).padStart(4, "0")));
});

test("rejects page-not-found responses clearly", () => assert.throws(
  () => parseDraw("<title>Page not found</title>", "https://example.com/missing"), /page-not-found/i));

test("rejects incomplete results", () => assert.throws(() => parseDraw(fixture.replace("0029", "")), /Expected 23/));
