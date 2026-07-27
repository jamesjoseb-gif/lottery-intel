import test from "node:test";
import assert from "node:assert/strict";
import { checksum, discoverDrawUrls, parseDraw } from "./import-4d.mjs";

const nums = (from, count) => Array.from({ length: count }, (_, i) => String(from + i).padStart(4, "0")).join(" </b><b> ");
const fixture = `<h1>Draw No. 5000</h1><p>Draw Date: 01 Jul 2026</p>
  <h2>1st Prize</h2><b>0001</b><h2>2nd Prize</h2><b>0002</b><h2>3rd Prize</h2><b>0003</b>
  <h2>Starter Prizes</h2><b>${nums(10, 10)}</b><h2>Consolation Prizes</h2><b>${nums(20, 10)}</b><h2>Next Draw</h2>`;

const currentMarkupFixture = `<div draw-date="26 Jul 2026"><span>5514</span></div>
  <table><tbody><tr>${Array.from({ length: 23 }, (_, i) => `<td>${String(i).padStart(4, "0")}</td>`).join("")}</tr></tbody></table>`;

test("discovers and de-duplicates official archive URLs", () => {
  assert.deepEqual(discoverDrawUrls(`<a href="fourd_result_draw_5000.html">x</a><option value="5000">x</option>`),
    ["https://www.singaporepools.com.sg/DataFileArchive/Lottery/Output/fourd_result_draw_5000.html"]);
});

test("parses all 23 values as four-character strings", () => {
  const draw = parseDraw(fixture);
  assert.equal(draw.drawNo, "5000"); assert.equal(draw.drawDate, "2026-07-01");
  assert.equal(draw.results.length, 23); assert.equal(draw.results[0].winning_number, "0001");
  assert.match(checksum(draw), /^[0-9a-f]{64}$/);
});

test("parses current result cells without prize headings", () => {
  const draw = parseDraw(currentMarkupFixture, "https://www.singaporepools.com.sg/DataFileArchive/Lottery/Output/fourd_result_draw_5514.html");
  assert.equal(draw.drawNo, "5514"); assert.equal(draw.drawDate, "2026-07-26");
  assert.deepEqual(draw.results.map(({ winning_number }) => winning_number),
    Array.from({ length: 23 }, (_, i) => String(i).padStart(4, "0")));
});

test("rejects incomplete results", () => assert.throws(() => parseDraw(fixture.replace("0029", "")), /Expected 23/));
