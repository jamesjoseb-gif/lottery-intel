import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Lottery Intel | Singapore Lottery Research",
  description: "Learn what Lottery Intel is, how we use historical Singapore lottery data, and the principles behind our independent research platform.",
};

export default function AboutPage() {
  return (
    <main className="page-shell">
      <section className="section-shell narrow-shell">
        <p className="eyebrow">ABOUT LOTTERY INTEL</p>
        <h1>Independent lottery data research for Singapore.</h1>
        <p className="lead-copy">
          Lottery Intel is an independent research platform for people who want to explore Singapore 4D, TOTO and Singapore Sweep results through historical data, statistics and AI-assisted analysis.
        </p>
        <h2>What we do</h2>
        <p>We organise historical draw data into practical research tools: number history, frequency, relationships between numbers, saved research and deeper analytical views.</p>
        <h2>What we do not do</h2>
        <p>Lottery Intel does not sell lottery tickets, accept wagers, operate a lottery, guarantee winnings or claim that historical patterns can change the probability of a random future draw.</p>
        <h2>Why we built it</h2>
        <p>Raw result tables answer one question: what happened? Lottery Intel is designed to make the historical data easier to investigate, compare and understand before a user makes their own decisions.</p>
        <h2>Independent by design</h2>
        <p>Lottery Intel is not affiliated with, endorsed by or operated by Singapore Pools. References to lottery products are for identification and research purposes.</p>
        <div className="button-row">
          <Link className="button primary" href="/how-it-works">See how our research works</Link>
          <Link className="button secondary" href="/contact">Contact Lottery Intel</Link>
        </div>
      </section>
    </main>
  );
}
