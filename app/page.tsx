import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { formatDrawDate, getLatestFourD, getLatestSweep, getLatestToto } from "@/lib/results";

export const revalidate = 60;

const intelligenceItems = [
  ["Frequency analysis", "See how often numbers and digit combinations have appeared across official draws."],
  ["Recency trends", "Track last-seen dates, current gaps and historical draw-to-draw intervals."],
  ["Prize breakdown", "Review 1st, 2nd, 3rd, Starter and Consolation results in one place."],
  ["Favourite number intelligence", "Build a clear historical profile for any 4D number from 0000 to 9999."],
  ["Hot and cold numbers", "Explore recent activity and long-missing numbers using transparent data."],
  ["Historical insights", "Study official result history without prediction guarantees or betting promises."],
];

const recentSearches = ["1234", "8888", "2026", "0001", "6789"];

export default async function HomePage() {
  const [fourDResult, totoResult, sweepResult] = await Promise.all([getLatestFourD(), getLatestToto(), getLatestSweep()]);
  const fourD = fourDResult.data ?? [];
  const toto = totoResult.data ?? [];
  const sweep = sweepResult.data ?? [];
  const dataError = fourDResult.error || totoResult.error || sweepResult.error;

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Data-Driven Lottery Intelligence</span>
            <h1>Singapore 4D, Toto &amp; Big Sweep Intelligence</h1>
            <p className="hero-copy">
              The most comprehensive data-driven intelligence platform for Singapore Pools 4D, Toto and Singapore Sweep, featuring historical results, frequency analysis, recency trends, favourite numbers and advanced statistical insights.
            </p>
            <SearchBox />
            <div className="quick-searches">
              <span>Search a 4D number</span>
              {recentSearches.map((number) => (
                <Link key={number} href={`/number/${number}`}>{number}</Link>
              ))}
            </div>
          </div>

          <aside className="hero-dashboard" aria-label="Lottery Intel overview">
            <div className="dashboard-label">Latest draw intelligence</div>
            <div className="dashboard-main">
              <div>
                <span>Coverage</span>
                <strong>4D, Toto &amp; Big Sweep</strong>
              </div>
              <div className="status-pill">Official results + data insights</div>
            </div>
            <div className="dashboard-grid">
              <div><span>4D</span><strong>Results &amp; number history</strong></div>
              <div><span>Toto</span><strong>Winning numbers &amp; trends</strong></div>
              <div><span>Big Sweep</span><strong>Monthly prize results</strong></div>
              <div><span>Intelligence</span><strong>Frequency &amp; recency</strong></div>
            </div>
            <Link className="dashboard-link" href="/live">View Latest Results →</Link>
          </aside>
        </div>
      </section>

      <section className="trust-strip">
        <div className="container trust-grid">
          <div><strong>Official published results</strong><span>4D, Toto and Singapore Sweep coverage</span></div>
          <div><strong>Data-driven intelligence</strong><span>Frequency, recency and historical patterns</span></div>
          <div><strong>Transparent and responsible</strong><span>No guaranteed predictions or betting promises</span></div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading">
          <div><span className="eyebrow">Latest published draws</span><h2>4D, Toto &amp; Big Sweep Results</h2></div>
          <Link href="/live">Open Results Centre →</Link>
        </div>
        <div className="result-grid">
          {dataError && <p className="state state-error results-error">Some latest results could not be loaded. Please try again later.</p>}
          <article className="result-card featured">
            <div className="card-top"><span>4D Latest Results</span><small>{fourD[0] ? formatDrawDate(fourD[0].draw_date) : "No published result"}</small></div>
            {(["first", "second", "third"] as const).map((type) => <div className="prize-row" key={type}><span>{type === "first" ? "1st" : type === "second" ? "2nd" : "3rd"}</span><strong>{fourD.find((row) => row.prize_type === type)?.winning_number ?? "—"}</strong></div>)}
            <Link href="/4d">View 4D Results &amp; Analysis</Link>
          </article>
          <article className="result-card">
            <div className="card-top"><span>Toto Latest Results</span><small>{toto[0] ? formatDrawDate(toto[0].draw_date) : "No published result"}</small></div>
            <div className="number-balls">{toto.filter((row) => row.number_kind === "main").map((row) => <b key={row.position}>{row.winning_number}</b>)}</div>
            <p>Additional number: <strong>{toto.find((row) => row.number_kind === "additional")?.winning_number ?? "—"}</strong></p>
            <Link href="/toto">View Toto Results &amp; Analysis</Link>
          </article>
          <article className="result-card">
            <div className="card-top"><span>Big Sweep Latest Results</span><small>{sweep[0] ? formatDrawDate(sweep[0].draw_date) : "No published result"}</small></div>
            <div className="sweep-number">{sweep[0]?.source_display_value ?? "—"}</div>
            <p>{sweep[0]?.source_label ?? "No published result"}</p>
            <Link href="/singapore-sweep">View Big Sweep Results</Link>
          </article>
        </div>
      </section>

      <section className="section intelligence-section">
        <div className="container intelligence-layout">
          <div>
            <span className="eyebrow">Data Intelligence</span>
            <h2>Go beyond results. Understand the data behind the numbers.</h2>
            <p className="section-copy">
              Lottery Intel turns official historical draw records into clear, useful intelligence. Search any 4D number, study its full appearance history, compare gaps and frequency, and understand recent activity without claiming to predict future outcomes.
            </p>
            <Link className="primary-link" href="/number/1234">Explore a Sample Number Profile →</Link>
          </div>
          <div className="intelligence-grid">
            {intelligenceItems.map(([title, copy]) => (
              <article key={title}><h3>{title}</h3><p>{copy}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading">
          <div><span className="eyebrow">Platform coverage</span><h2>One intelligence platform for three Singapore games</h2></div>
        </div>
        <div className="game-grid">
          <Link href="/4d"><span>01</span><h3>4D Intelligence</h3><p>Latest results, Starter and Consolation records, frequency, last-seen dates, number timelines and historical gaps.</p><strong>Explore 4D →</strong></Link>
          <Link href="/toto"><span>02</span><h3>Toto Intelligence</h3><p>Winning numbers, additional number, jackpot information, draw history and data-driven statistical trends.</p><strong>Explore Toto →</strong></Link>
          <Link href="/singapore-sweep"><span>03</span><h3>Big Sweep Results</h3><p>Singapore Sweep monthly results, winning ticket numbers, prize tiers and searchable historical records.</p><strong>Explore Big Sweep →</strong></Link>
        </div>
      </section>

      <section className="section editorial-section">
        <div className="container editorial-grid">
          <div>
            <span className="eyebrow">Understand the intelligence</span>
            <h2>Clear data, useful context and responsible analysis.</h2>
            <p className="section-copy">Learn how to read frequency, recency, gaps and historical patterns across 4D, Toto and Big Sweep results.</p>
          </div>
          <div className="article-list">
            <article><span>Data Guide</span><h3>How Lottery Intel works</h3><p>Understand what frequency, recency, gaps and number timelines reveal—and what they do not.</p></article>
            <article><span>4D Guide</span><h3>Starter and Consolation prizes explained</h3><p>A simple breakdown of the complete official 4D result structure.</p></article>
            <article><span>Responsible Use</span><h3>Historical data is not a prediction</h3><p>Past draw patterns provide context, but they cannot guarantee future results.</p></article>
          </div>
        </div>
      </section>

      <section className="section container responsible-card">
        <div>
          <span className="eyebrow">Responsible gambling</span>
          <h2>Use lottery data as information and entertainment—not financial advice.</h2>
        </div>
        <p>Lottery Intel presents official results and historical data analysis only. It does not guarantee winnings, promise successful selections or encourage spending beyond personal limits.</p>
      </section>
    </>
  );
}
