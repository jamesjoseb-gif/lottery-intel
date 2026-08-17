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
  const unusedBudget = Math.max(0, plan.budget - plan.totalSpend);

  return <main className="container page-shell">
    <nav className="number-nav"><Link href="/">Home</Link><span>/</span><Link href="/4d">4D</Link><span>/ Strategy</span></nav>
    <span className="eyebrow">4D Smart Strategy</span>
    <h1>AI-Optimised 4D Buying Strategy</h1>
    <p className="section-copy">Set the amount you already intend to spend and choose what matters most to you. Lottery Intel turns current historical intelligence into a clear 4D plan, while reducing duplicate coverage and showing exactly where the budget goes.</p>

    <form className="lucky-form" method="get">
      <label><span>My budget for this draw (S$)</span><input name="budget" type="number" min="10" max="10000" step="1" defaultValue={plan.budget} /></label>
      <label><span>My objective</span><select name="goal" defaultValue={goal}>{Object.values(FOURD_STRATEGY_RULES).map(item => <option key={item.goal} value={item.goal}>{item.label}</option>)}</select></label>
      <button type="submit">Build my 4D plan</button>
    </form>

    <section className="ranking-method" aria-labelledby="plan-summary">
      <span className="eyebrow">Your plan at a glance</span>
      <h2 id="plan-summary">{rules.label} · S${plan.budget}</h2>
      <p>{rules.explanation}</p>
      <div className="number-summary-grid">
        <div><span>Planned spend</span><strong>S${plan.totalSpend}</strong></div>
        <div><span>System families</span><strong>S${plan.systemSpend}</strong></div>
        <div><span>Exact selections</span><strong>S${plan.exactSpend}</strong></div>
        <div><span>Unique numbers covered</span><strong>{plan.uniqueNumbersCovered}</strong></div>
        <div><span>Overlap removed</span><strong>{plan.overlapRemoved}</strong></div>
        <div><span>Coverage efficiency</span><strong>{(plan.coverageEfficiency * 100).toFixed(0)}%</strong></div>
      </div>
      {unusedBudget > 0 && <p><strong>S${unusedBudget} remains unallocated.</strong> The optimiser will not force a selection merely to use every dollar when the current candidate set does not fit the strategy rules.</p>}
    </section>

    {rankings.error ? <div className="state state-error"><strong>Strategy data could not be loaded.</strong><small>{rankings.error}</small></div> : <>
      <section className="ranking-method">
        <span className="eyebrow">Step 1</span>
        <h2>System-family plan</h2>
        <p>These families are selected first because one family can cover several arrangements of the same four digits. The optimiser prices every unique permutation and avoids paying twice for the same exact 4D number.</p>
        {plan.systemPicks.length ? <div>{plan.systemPicks.map((pick, index) => <article key={pick.family}>
          <h3>#{index + 1} · {pick.family} family</h3>
          <p><strong>Action:</strong> cover all {pick.permutations.length} unique permutations · <strong>Cost:</strong> S${pick.cost} at $1 Big per permutation</p>
          <p><strong>Historical Intelligence:</strong> {pick.intelligence.toFixed(0)}/100</p>
          <details><summary>Show the {pick.permutations.length} exact combinations</summary><p>{pick.permutations.join(", ")}</p></details>
        </article>)}</div> : <p>No system family fits the selected system allocation. The remaining budget is left for exact selections instead of forcing an inefficient system.</p>}
      </section>

      <section className="ranking-method">
        <span className="eyebrow">Step 2</span>
        <h2>Exact-number plan</h2>
        <p>These are the highest-ranked exact selections that fit the remaining allocation and are not already covered by the system families above.</p>
        {plan.exactPicks.length ? <div>{plan.exactPicks.map((pick, index) => <article key={pick.number}>
          <h3>#{index + 1} · <Link href={`/4d/number/${pick.number}`}>{pick.number}</Link></h3>
          <p><strong>Action:</strong> $1 Big · <strong>Historical Intelligence:</strong> {pick.intelligence}/100 · <Link href={`/4d/number/${pick.number}`}>Why this number? →</Link></p>
        </article>)}</div> : <p>No separate exact selections are required for this plan.</p>}
      </section>
    </>}

    <section className="ranking-method">
      <span className="eyebrow">Membership direction</span>
      <h2>What paying members will get</h2>
      <p><strong>Free users</strong> will be able to try the strategy once and see a limited preview. <strong>Registered free accounts</strong> will receive up to five strategy/number analyses per month. <strong>Members</strong> will unlock the complete current-draw plan, saved favourites, unlimited analyses, monthly intelligence and plan/result tracking. <strong>Pro</strong> will add large custom-budget portfolios, scenario comparison, advanced overlap optimisation, personal Strategy Lab backtesting and deeper AI analysis.</p>
      <p>The membership gate is deliberately not switched on yet so we can test the full strategy experience and calculations before asking customers to pay.</p>
    </section>

    <aside className="rankings-warning"><strong>Historical intelligence is not a prediction or guarantee.</strong> Lottery draws remain random. Lottery Intel is designed to organise a budget you already intend to use, compare historical profiles, improve coverage efficiency and make the trade-off between wider coverage and concentrated payout exposure easier to understand.</aside>
  </main>;
}
