import type { Metadata } from "next";
import Link from "next/link";
import { allocateFourDBudget, FOURD_STRATEGY_RULES, type FourDStrategyGoal } from "@/lib/fourd-strategy";

export const metadata: Metadata = {
  title: "AI-Optimised 4D Buying Strategy",
  description: "Build a budget-aware 4D strategy using system coverage, exact selections and historical intelligence.",
};

type Props = { searchParams: Promise<{ budget?: string; goal?: string }> };

export default async function FourDStrategyPage({ searchParams }: Props) {
  const params = await searchParams;
  const goal: FourDStrategyGoal = params.goal === "balanced" || params.goal === "payout" ? params.goal : "coverage";
  const plan = allocateFourDBudget(params.budget ?? 50, goal);

  return <main className="container page-shell">
    <nav className="number-nav"><Link href="/">Home</Link><span>/</span><Link href="/4d">4D</Link><span>/ Strategy</span></nav>
    <span className="eyebrow">Lottery Intel strategy prototype</span>
    <h1>AI-Optimised 4D Buying Strategy</h1>
    <p className="section-copy">Tell us the budget you already intend to use and your objective. Lottery Intel structures that budget across system-family coverage and exact selections using historical intelligence and coverage efficiency.</p>

    <form className="lucky-form" method="get">
      <label><span>Budget ceiling (S$)</span><input name="budget" type="number" min="10" max="10000" step="1" defaultValue={plan.budget} /></label>
      <label><span>Strategy objective</span><select name="goal" defaultValue={goal}>{Object.values(FOURD_STRATEGY_RULES).map(item => <option key={item.goal} value={item.goal}>{item.label}</option>)}</select></label>
      <button type="submit">Build my strategy</button>
    </form>

    <section className="ranking-method">
      <h2>{plan.rules.label} · S${plan.budget}</h2>
      <p>{plan.rules.explanation}</p>
      <p><strong>System-family allocation:</strong> about S${plan.systemBudget} · <strong>Exact-selection allocation:</strong> about S${plan.exactBudget}</p>
    </section>

    <aside className="rankings-warning"><strong>Historical intelligence is not a prediction or guarantee.</strong> Lottery draws remain random. This tool is designed to organise a chosen budget, reduce duplicate coverage and explain the trade-off between broader coverage and concentrated payout exposure.</aside>

    <section className="ranking-method"><h2>Next engine step</h2><p>The production optimiser will fill these allocations with ranked system families and exact selections, remove overlapping combinations, show coverage efficiency, and save the plan before the draw so its performance can be measured transparently afterwards.</p></section>
  </main>;
}
