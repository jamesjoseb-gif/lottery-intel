import type { Metadata } from "next";
import Link from "next/link";
import { getFourDStrategyPlan } from "@/lib/fourd-strategy-data";
import type { FourDStrategyGoal } from "@/lib/fourd-strategy-optimizer";

export const metadata: Metadata = {
  title: "4D AI-Optimised Buying Strategy",
  description: "Build a 4D buying plan around your chosen budget and objective using historical intelligence, system-family coverage and duplicate removal.",
  alternates: { canonical: "/4d/strategy" },
};
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ budget?: string; goal?: string }> };
const goals: Record<FourDStrategyGoal, { label: string; copy: string }> = {
  coverage: { label: "Maximum Strike Coverage", copy: "Prioritise unique number coverage and system-family efficiency." },
  balanced: { label: "Balanced", copy: "Mix system coverage with more exact-number concentration." },
  payout: { label: "Higher Payout", copy: "Use fewer systems and concentrate more of the budget on exact selections." },
};
const validGoal = (value?: string): FourDStrategyGoal => value === "balanced" || value === "payout" ? value : "coverage";
const validBudget = (value?: string) => { const n = Number(value); return Number.isFinite(n) ? Math.max(1, Math.min(10000, Math.floor(n))) : 50; };

export default async function FourDStrategyPage({ searchParams }: Props) {
  const params = await searchParams;
  const budget = validBudget(params.budget);
  const goal = validGoal(params.goal);
  const result = await getFourDStrategyPlan(budget, goal);
  const plan = result.data;
  return <main className="container page-shell strategy-page">
    <nav className="number-nav" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/4d">4D</Link><span>/ Strategy</span></nav>
    <span className="eyebrow">AI-optimised lottery buying strategy</span>
    <h1>4D Smart Strategy</h1>
    <p className="section-copy">Tell Lottery Intel your budget and objective. The optimiser uses historical intelligence to rank candidates, favours efficient system families, removes duplicate coverage and then allocates the remaining budget to exact numbers.</p>
    <aside className="rankings-warning"><strong>This is a buying-strategy optimiser, not a winning prediction.</strong> Historical patterns do not change the mathematical odds of an independent draw. The tool helps organise a chosen budget more systematically.</aside>

    <form className="lucky-form" action="/4d/strategy" method="get">
      <label><span>Budget per draw (S$)</span><input name="budget" type="number" min="1" max="10000" step="1" defaultValue={budget} /></label>
      <label><span>Objective</span><select name="goal" defaultValue={goal}>{Object.entries(goals).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
      <button type="submit">Generate my strategy</button>
    </form>

    <section className="ranking-method"><h2>{goals[goal].label}</h2><p>{goals[goal].copy}</p></section>

    {result.error ? <div className="state state-error" role="alert"><strong>Strategy could not be generated.</strong><small>{result.error}</small></div> : plan && <>
      <section className="metric-grid number-stat-grid" aria-label="Plan summary">
        <div className="metric"><span>Budget</span><strong>S${plan.budget}</strong></div>
        <div className="metric"><span>Allocated</span><strong>S${plan.spent}</strong></div>
        <div className="metric"><span>Unique numbers covered</span><strong>{plan.uniqueNumbersCovered}</strong></div>
        <div className="metric"><span>Historical profile</span><strong>{plan.confidence.replace("-", " ")}</strong></div>
      </section>
      <section className="data-panel"><div className="history-heading"><div><span className="eyebrow">Your plan</span><h2>Recommended allocation</h2><p>{plan.explanation}</p></div></div>
        {plan.lines.length === 0 ? <p className="inline-state">No eligible selections were available for this plan.</p> : <div className="ranking-table-wrap"><table className="ranking-table"><thead><tr><th>Type</th><th>Selection</th><th>Coverage</th><th>Cost</th><th>Historical Intelligence</th></tr></thead><tbody>{plan.lines.map((line, index) => <tr key={`${line.kind}-${line.label}-${index}`}>
          <td data-label="Type">{line.kind === "system" ? "System family" : "Exact"}</td>
          <td data-label="Selection"><strong>{line.label}</strong>{line.kind === "system" && <small>{line.numbers.slice(0, 8).join(", ")}{line.numbers.length > 8 ? "…" : ""}</small>}</td>
          <td data-label="Coverage">{line.numbers.length} number{line.numbers.length === 1 ? "" : "s"}</td>
          <td data-label="Cost">S${line.cost}</td>
          <td data-label="Historical Intelligence">{line.intelligenceScore}/100</td>
        </tr>)}</tbody></table></div>}
        {plan.unallocated > 0 && <p className="responsible-message">S${plan.unallocated} remains unallocated because no additional non-duplicate candidate fit the current strategy set.</p>}
      </section>
      <section className="ranking-method"><h2>Why this plan?</h2><p>Maximum Coverage puts more of the budget into system-family coverage; Balanced keeps more room for exact numbers; Higher Payout concentrates more heavily on exact selections. Historical Intelligence is used as a ranking and tie-break signal, while duplicate removal and budget efficiency determine the final allocation.</p></section>
    </>}
  </main>;
}
