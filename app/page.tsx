import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { latestResults } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">AI-Powered Lottery Intelligence</span>
            <h1>Understand the numbers behind Singapore lottery results.</h1>
            <p className="hero-copy">Search 4D history, check official results and explore transparent historical statistics. No registration. Free for everyone.</p>
            <SearchBox />
          </div>
          <div className="hero-panel" aria-label="Platform principles">
            <div><strong>Official results</strong><span>Published data only</span></div>
            <div><strong>Historical insights</strong><span>No prediction claims</span></div>
            <div><strong>Open access</strong><span>No sign-up required</span></div>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading"><div><span className="eyebrow">Latest published draws</span><h2>Results centre</h2></div><Link href="/live">Open Live Draw Centre →</Link></div>
        <div className="result-grid">
          <article className="result-card featured">
            <div className="card-top"><span>4D</span><small>{latestResults.fourD.drawDate}</small></div>
            <div className="prize-row"><span>1st</span><strong>{latestResults.fourD.first}</strong></div>
            <div className="prize-row"><span>2nd</span><strong>{latestResults.fourD.second}</strong></div>
            <div className="prize-row"><span>3rd</span><strong>{latestResults.fourD.third}</strong></div>
            <Link href="/4d">View full 4D results</Link>
          </article>
          <article className="result-card">
            <div className="card-top"><span>TOTO</span><small>{latestResults.toto.drawDate}</small></div>
            <div className="number-balls">{latestResults.toto.numbers.map((n, i) => <b key={i}>{n}</b>)}</div>
            <p>Next advertised prize: <strong>{latestResults.toto.nextPrize}</strong></p>
            <Link href="/toto">View TOTO results</Link>
          </article>
          <article className="result-card">
            <div className="card-top"><span>Singapore Sweep</span><small>Monthly draw</small></div>
            <div className="sweep-number">{latestResults.sweep.first}</div>
            <p>First-prize result</p>
            <Link href="/singapore-sweep">View Sweep results</Link>
          </article>
        </div>
      </section>

      <section className="section soft-section">
        <div className="container">
          <span className="eyebrow">Built for clarity</span><h2>More than a results page</h2>
          <div className="feature-grid">
            <article><h3>Number profiles</h3><p>Permanent pages for every number from 0000 to 9999, including appearances, prize categories, gaps and timelines.</p></article>
            <article><h3>Live Draw Centre</h3><p>See the next draw, official advertised prize and publication status in one focused view.</p></article>
            <article><h3>Transparent analytics</h3><p>Every insight is based on historical records and clearly separated from prediction or betting advice.</p></article>
          </div>
        </div>
      </section>
    </>
  );
}
