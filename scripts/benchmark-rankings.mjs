import { performance } from "node:perf_hooks";

const raw = Array.from({ length: 71_000 }, (_, index) => ({ winning_number: String((index * 7919) % 10_000).padStart(4, "0"), draw_date: new Date(Date.UTC(2018, 0, 1 + Math.floor(index / 23))).toISOString().slice(0, 10), prize_type: ["first", "second", "third", "starter", "consolation"][index % 5] }));
function oldGeneration(rows) { const groups = new Map(); for (const row of rows) { const list = groups.get(row.winning_number) ?? []; list.push(row); groups.set(row.winning_number, list); } return [...groups].map(([winning_number, appearances]) => ({ winning_number, total: appearances.length, last: appearances.at(-1).draw_date })).sort((a, b) => b.total - a.total); }
const compact = oldGeneration(raw);
function newGeneration(rows) { return [...rows].sort((a, b) => b.total - a.total || a.winning_number.localeCompare(b.winning_number)); }
function measure(action) { const samples = []; for (let i = 0; i < 25; i++) { const start = performance.now(); action(); samples.push(performance.now() - start); } return samples.sort((a, b) => a - b)[12]; }
console.log(JSON.stringify({ fixtureRawRows: raw.length, aggregateRows: compact.length, oldMedianMs: +measure(() => oldGeneration(raw)).toFixed(2), newMedianMs: +measure(() => newGeneration(compact)).toFixed(2) }, null, 2));
