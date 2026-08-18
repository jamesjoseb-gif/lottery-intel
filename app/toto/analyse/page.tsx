import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Analyse My TOTO Bet | Lottery Intel",
  description: "Enter intended TOTO numbers, choose Match 2/3/4 or System research, and get a transparent historical research assessment.",
};

type Props = { searchParams: Promise<{ mode?: string; numbers?: string; budget?: string }> };

const modes = [
  { value: "match2", label: "Match 2", note: "Pair relationship research" },
  { value: "match3", label: "Match 3", note: "Triple relationship consensus" },
  { value: "match4", label: "Match 4", note: "High-variance quadruple research" },
  { value: "standard", label: "Standard TOTO", note: "Six-number research" },
  { value: "system", label: "System", note: "Pool and cost comparison" },
] as const;

export default async function TotoAnalysePage({ searchParams }: Props) {
  const params = await searchParams;
  const selected = modes.some((m) => m.value === params.mode) ? params.mode! : "match3";
  const budget = Math.max(1, Math.min(10000, Number(params.budget ?? 50) || 50));
  const raw = (params.numbers ?? "").split(/[\s,]+/).filter(Boolean);
  const numbers = [...new Set(raw.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 49))].slice(0, 12);
  const hasInput = numbers.length > 0;

  return <main className="container page-shell">
    <nav className="number-nav"><Link href="/">Home</Link><span>/</span><Link href="/toto">TOTO</Link><span>/ Analyse My Bet</span></nav>
    <span className="eyebrow">TOTO Intelligence</span>
    <h1>Analyse my TOTO bet</h1>
    <p className="section-copy">Already have numbers in mind? Enter them before the draw. Lottery Intel will score their historical relationships, explain the strengths and weaknesses and compare them with research-based alternatives. The score is not a probability of winning.</p>

    <form className="lucky-form" method="get">
      <label><span>Your intended / favourite numbers</span><input name="numbers" type="text" placeholder="e.g. 3, 10, 18, 27, 32, 41" defaultValue={numbers.join(", ")} /></label>
      <label><span>What are you targeting?</span><select name="mode" defaultValue={selected}>{modes.map((m) => <option key={m.value} value={m.value}>{m.label} — {m.note}</option>)}</select></label>
      <label><span>Maximum budget (S$)</span><input name="budget" type="number" min="1" max="10000" step="1" defaultValue={budget} /></label>
      <button type="submit">Research my bet</button>
    </form>

    {!hasInput ? <section className="ranking-method"><h2>What happens next?</h2><p>Enter at least two numbers. V1 will score individual number history, identify the strongest pair/triple/quad relationships inside your set, highlight weaker relationships and suggest AI alternatives while keeping your favourites where possible.</p></section> : <AnalysisPreview numbers={numbers} mode={selected} budget={budget} />}

    <aside className="rankings-warning"><strong>Research score ≠ chance of winning.</strong> TOTO draws remain random. Historical relationships can help compare and structure intended selections, but they do not guarantee future results. Lottery Intel treats your budget as a maximum and may recommend leaving part of it unused.</aside>
  </main>;
}

function AnalysisPreview({ numbers, mode, budget }: { numbers: number[]; mode: string; budget: number }) {
  const required = mode === "match2" ? 2 : mode === "match3" ? 3 : mode === "match4" ? 4 : 6;
  const enough = numbers.length >= required;
  const relationships = combinationCount(numbers.length, required);
  return <>
    <section className="ranking-method">
      <span className="eyebrow">Your research setup</span>
      <h2>{numbers.map((n) => String(n).padStart(2, "0")).join(" · ")}</h2>
      <p><strong>Target:</strong> {modes.find((m) => m.value === mode)?.label} · <strong>Maximum budget:</strong> S${budget}</p>
      <p><strong>{relationships.toLocaleString("en-SG")}</strong> {required}-number relationship{relationships === 1 ? "" : "s"} exist inside your entered set.</p>
      {!enough && <p className="state state-error">Add at least {required} unique numbers for this research mode.</p>}
    </section>

    {enough && <section className="ranking-method">
      <h2>Scoring engine connection is next</h2>
      <p>The page is now ready for the server-side engine from our backtesting research: Match 2 uses exact pair relationships; Match 3 uses the 180/210-day consensus model; Match 4 uses high-variance quadruple research; Standard/System compares number pools and cost efficiency.</p>
      <p>The completed result card will show a 0–100 Research Score, strongest and weakest relationships, stability evidence, suggested replacements, Favourite + AI alternatives and recommended budget deployment.</p>
    </section>}
  </>;
}

function combinationCount(n: number, r: number) {
  if (n < r) return 0;
  let out = 1;
  for (let i = 1; i <= r; i++) out = out * (n - r + i) / i;
  return Math.round(out);
}
