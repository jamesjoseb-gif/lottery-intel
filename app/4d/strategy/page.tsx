import type { Metadata } from "next";
import Link from "next/link";
import { getFourDRankings } from "@/lib/fourd-rankings-data";
import { FOURD_STRATEGY_RULES, type FourDStrategyGoal } from "@/lib/fourd-strategy";
import { buildFourDStrategyPlan } from "@/lib/fourd-strategy-plan";

export const metadata: Metadata = {
  title: "AI-Optimised 4D Buying Strategy",
  description: "Build a budget-aware 4D strategy using system coverage, exact selections and historical intelligence.",
};

type Props = { searchParams: Promise<{ budget?: string; goal?: string }> };

export default async function FourDStrategyPage({ searchParams }: Props) {
  const params = await searchParams;
  const goal: FourDStrategyGoal = params.goal === "balanced" || params.goal === "payout" ? params.goal : "coverage";
  const rankings = await getFourDRankings("365");
  const plan = buildFourDStrategyPlan(rankings.data?.hot ?? [], Number(params.budget ?? 50), goal);
  const rules = FOURD_STRATEGY_RULES[goal];

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
      <h2>{rules.label} · S${plan.budget}</h2>
      <p>{rules.explanation}</p>
      <p><strong>Actual plan spend:</strong> S${plan.totalSpend} · <strong>System families:</strong> S${plan.systemSpend} · <strong>Exact selections:</strong> S${plan.exactSpend}</p>
      <p><strong>Unique 4D numbers covered:</strong> {plan.uniqueNumbersCovered} · <strong>Duplicate/overlap selections removed:</strong> {plan.overlapRemoved} · <strong>Coverage efficiency:</strong> {(plan.coverageEfficiency * 100).toFixed(0)}%</p>
    </section>

    {rankings.error ? <div className="state state-error"><strong>Strategy data could not be loaded.</strong><small>{rankings.error}</small></div> : <>
      <section className="ranking-method">
        <h2>System-family selections</h2>
        {plan.systemPicks.length ? <div>{plan.systemPicks.map((pick) => <article key={pick.family}><h3>{pick.family} family</h3><p><strong>{pick.permutations.length}</strong> unique permutations · S${pick.cost} at $1 Big per permutation</p><p>Historical Intelligence: <strong>{pick.intelligence.toFixed(0)}/100</strong></p><p>{pick.permutations.join(", ")}</p></article>)}</div> : <p>No system family fits the selected system allocation.</p>}
      </section>

      <section className="ranking-method">
        <h2>Exact-number selections</h2>
        {plan.exactPicks.length ? <div>{plan.exactPicks.map((pick) => <article key={pick.number}><h3><Link href={`/4d/number/${pick.number}`}>{pick.number}</Link></h3><p>$1 Big · Historical Intelligence <strong>{pick.intelligence}/100</strong></p></article>)}</div> : <p>No separate exact selections are required for this plan.</p>}
      </section>
    </>}

    <aside className="rankings-warning"><strong>Historical intelligence is not a prediction or guarantee.</strong> Lottery draws remain random. This prototype uses current 365-day rankings to organise a chosen budget, prioritise efficient system families and remove duplicate coverage. The production version will also save the plan before each draw for transparent performance tracking.</aside>
  </main>;
}
