import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How Lottery Intel Works | AI-Assisted Lottery Research",
  description: "Understand how Lottery Intel combines historical Singapore draw data, statistical relationships and AI-assisted interpretation without claiming to predict random draws.",
};

export default function HowItWorksPage() {
  return (
    <main className="page-shell"><section className="section-shell narrow-shell">
      <p className="eyebrow">HOW IT WORKS</p><h1>AI-assisted research, not lottery prediction.</h1>
      <p className="lead-copy">Lottery Intel turns historical draw records into structured research. AI helps explain and compare the data; it does not know the next winning numbers.</p>
      <h2>1. Start with historical draw data</h2><p>Our tools use historical Singapore lottery results as the evidence base for the statistics shown on the platform.</p>
      <h2>2. Measure more than simple frequency</h2><p>Where relevant, Lottery Intel examines how intended numbers have appeared historically, including pair, triple and higher-order relationships rather than relying only on a hot-versus-cold label.</p>
      <h2>3. Compare different time windows</h2><p>Recent and longer historical windows can tell different stories. Our research tools make those differences visible instead of presenting one score as certainty.</p>
      <h2>4. Use AI to interpret, compare and explain</h2><p>AI-assisted features help organise findings, surface notable relationships and explain alternatives in plain language. Statistical outputs remain grounded in the underlying historical data.</p>
      <h2>5. Keep the decision with the user</h2><p>Every draw is random. A number being frequent, infrequent or historically related to another number does not make it due to win. Lottery Intel is an information and research service, not betting advice or a guarantee of returns.</p>
      <p className="fine-print">Past results do not predict future outcomes. Set a budget you can afford and treat that budget as a maximum, not a target.</p>
      <div className="button-row"><Link className="button primary" href="/">Research your numbers</Link><Link className="button secondary" href="/about">About Lottery Intel</Link></div>
    </section></main>
  );
}