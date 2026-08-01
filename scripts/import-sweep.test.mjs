import test from "node:test"; import assert from "node:assert/strict"; import { readFileSync } from "node:fs";
import { discoverSweepDraws, parseSweepDraw, validateSweepDraw } from "./import-sweep.mjs";
const fixture = readFileSync(new URL("fixtures/sweep-valid.html", import.meta.url), "utf8");
test("discovers official Big Sweep entries", () => assert.equal(discoverSweepDraws(`<option queryString='sppl=abc' value='1092'>Wed, 01 Jul 2026</option>`)[0].drawNo, "1092"));
test("parses grouped prizes with either standard or legacy custom span tags", () => { const d=parseSweepDraw(fixture,"official","1092"); assert.equal(d.results.length,5); assert.equal(d.results[0].ticket_number,"0006428"); assert.equal(d.results[0].entry_suffix,"6428"); assert.equal(d.results[4].ticket_number,"0000042"); const standard=parseSweepDraw(fixture.replaceAll("span1", "span"),"official","1092"); assert.deepEqual(standard.results,d.results); });
test("captures every current official tier and displayed result row", () => {
  const groups = [["10 Jackpot Prizes",10],["10 Lucky Prizes",10],["30 Gift Prizes",30],["30 Consolation Prizes",30],["50 Participation Prizes",50],["315,000 2D Delight Prizes",9]];
  const tables = groups.map(([label,count], group) => `<table><th><span class="prizeGroupHeading">${label} @ $1 each</span></th><tbody><tr>${Array.from({length:count},(_,i)=>`<td>${String(group * 100 + i).padStart(group === 5 ? 2 : 7,"0")}</td>`).join("")}</tr></tbody></table>`).join("");
  const complete = fixture.replace(/<table><th><span1 class="prizeGroupHeading">[\s\S]*?<\/table>/, tables);
  const draw = parseSweepDraw(complete,"official","1092");
  assert.equal(draw.results.length,142);
  assert.deepEqual(Object.fromEntries(groups.map(([label]) => { const tier=label.toLowerCase().replace(/@.*$/, "").replace(/^\s*\d[\d,]*\s+/, "").replace(/\s+prizes?\s*$/, "").replace(/[^a-z0-9]+/g,"_"); return [tier,draw.results.filter(row=>row.tier_code===tier).length]; })), { jackpot:10,lucky:10,gift:30,consolation:30,participation:50,"2d_delight":9 });
});
test("rejects a missing top tier", () => assert.throws(() => parseSweepDraw(fixture.replace('class="valueThirdPrize"','class="changed"'),"official"), /Missing required third/));
test("rejects empty or malformed rows", () => assert.equal(validateSweepDraw({drawNo:"1",drawDate:"2026-01-01",results:[{tier_code:"first",source_label:"",position:1,ticket_number:"",source_display_value:""}]}).ok,false));
test("rejects page-not-found and changed layouts", () => { assert.throws(()=>parseSweepDraw("Page not found","official"),/Page not found/); assert.throws(()=>parseSweepDraw("Draw No. 1 Wed, 01 Jul 2026","official"),/Missing required/); });
