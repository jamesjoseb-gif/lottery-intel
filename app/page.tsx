import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { formatDrawDate, getLatestFourD, getLatestSweep, getLatestToto } from "@/lib/results";

export const revalidate = 60;

const intelligenceItems = [
  ["Appearance history", "See every official draw in which a 4D number appeared."],
  ["Prize breakdown", "Separate 1st, 2nd, 3rd, Starter and Consolation results."],
  ["Gap analysis", "Track current gaps, longest gaps and draw-to-draw intervals."],
  ["Digit patterns", "Review each digit by position, frequency and historical spread."],
];

const recentSearches = ["1234", "8888", "2026", "0001", "6789"];

export default async function HomePage() {
  const [fourDResult, totoResult, sweepResult] = await Promise.all([getLatestFourD(), getLatestToto(), getLatestSweep()]);
  const fourD = fourDResult.data ?? []; const toto = totoResult.data ?? []; const sweep = sweepResult.data ?? [];
  const dataError = fourDResult.error || totoResult.error || sweepResult.error;
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">AI-Powered Lottery Intelligence</span>
            <h1>Understand the numbers behind Singapore lottery results.</h1>
            <p className="hero-copy">
              Search official 4D history, review published results and explore transparent historical statistics. Free to use, with no registration required.
            </p>
            <SearchBox />
            <div className="quick-searches">
              <span>Popular searches</span>
              {recentSearches.map((number) => (
                <Link key={number} href={`/number/${number}`}>{number}</Link>
              ))}
            </div>
          </div>

          <aside className="hero-dashboard" aria-label="Lottery Intel overview">
            <div className="dashboard-label">Next draw centre</div>
            <div className="dashboard-main">
              <div>
                <span>Official schedule</span>
                <strong>Singapore draws</strong>
              </div>
              <div className="status-pill">Published results online</div>
            </div>
            <div className="dashboard-grid">
              <div><span>4D</span><strong>Wed, Sat & Sun</strong></div>
              <div><span>TOTO</span><strong>Mon & Thu</strong></div>
              <div><span>Sweep</span><strong>Monthly</strong></div>
              <div><span>Access</span><strong>Free for all</strong></div>
            </div>
            <Link className="dashboard-link" href="/live">Open Live Draw Centre →</Link>
          </aside>
        </div>
      </section>

      <section className="trust-strip">
        <div className="container trust-grid">
          <div><strong>Official published results</strong><span>No unofficial tips or claims</span></div>
          <div><strong>Historical intelligence</strong><span>Facts, timelines and transparent analysis</span></div>
          <div><strong>Responsible by design</strong><span>No prediction guarantee or betting promise</span></div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading">
          <div><span className="eyebrow">Latest published draws</span><h2>Results centre</h2></div>
          <Link href="/live">Open Live Draw Centre →</Link>
        </div>
        <div className="result-grid">
          {dataError && <p className="state state-error results-error">Some latest results could not be loaded. Please try again later.</p>}
          <article className="result-card featured">
            <div className="card-top"><span>4D</span><small>{fourD[0] ? formatDrawDate(fourD[0].draw_date) : "No published result"}</small></div>
            {(["first", "second", "third"] as const).map((type) => <div className="prize-row" key={type}><span>{type === "first" ? "1st" : type === "second" ? "2nd" : "3rd"}</span><strong>{fourD.find((row) => row.prize_type === type)?.winning_number ?? "—"}</strong></div>)}
            <Link href="/4d">View full 4D results</Link>
          </article>
          <article className="result-card">
            <div className="card-top"><span>TOTO</span><small>{toto[0] ? formatDrawDate(toto[0].draw_date) : "No published result"}</small></div>
            <div className="number-balls">{toto.filter((row) => row.number_kind === "main").map((row) => <b key={row.position}>{row.winning_number}</b>)}</div>
            <p>Additional number: <strong>{toto.find((row) => row.number_kind === "additional")?.winning_number ?? "—"}</strong></p>
            <Link href="/toto">View TOTO results</Link>
          </article>
          <article className="result-card">
            <div className="card-top"><span>Singapore Sweep</span><small>{sweep[0] ? formatDrawDate(sweep[0].draw_date) : "No published result"}</small></div>
            <div className="sweep-number">{sweep[0]?.source_display_value ?? "—"}</div>
            <p>{sweep[0]?.source_label ?? "No published result"}</p>
            <Link href="/singapore-sweep">View Sweep results</Link>
          </article>
        </div>
      </section>

      <section className="section intelligence-section">
        <div className="container intelligence-layout">
          <div>
            <span className="eyebrow">Number Intelligence</span>
            <h2>One permanent profile for every 4D number.</h2>
            <p className="section-copy">
              Search any number from 0000 to 9999 and review its official historical record in one clear profile. The platform explains what happened in past draws without claiming what will happen next.
            </p>
            <Link className="primary-link" href="/number/1234">View a sample number profile →</Link>
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
          <div><span className="eyebrow">Platform coverage</span><h2>Three official Singapore games</h2></div>
        </div>
        <div className="game-grid">
          <Link href="/4d"><span>01</span><h3>4D Intelligence</h3><p>Top prizes, Starter and Consolation records, number timelines and historical gaps.</p><strong>Explore 4D →</strong></Link>
          <Link href="/toto"><span>02</span><h3>TOTO Results</h3><p>Winning numbers, additional number, advertised jackpot and historical draw records.</p><strong>Explore TOTO →</strong></Link>
          <Link href="/singapore-sweep"><span>03</span><h3>Singapore Sweep</h3><p>Monthly official results, prize tiers and draw history in a cleaner searchable format.</p><strong>Explore Sweep →</strong></Link>
        </div>
      </section>

      <section className="section editorial-section">
        <div className="container editorial-grid">
          <div>
            <span className="eyebrow">Lottery knowledge</span>
            <h2>Understand the data before reading the numbers.</h2>
            <p className="section-copy">Guides will explain draw schedules, prize categories, statistical terms and how to read historical patterns responsibly.</p>
          </div>
          <div className="article-list">
            <article><span>Guide</span><h3>How Number Intelligence works</h3><p>What frequency, gaps and timelines mean—and what they do not mean.</p></article>
            <article><span>4D Basics</span><h3>Starter and Consolation prizes explained</h3><p>A simple breakdown of the full official 4D result structure.</p></article>
            <article><span>Responsible play</span><h3>Historical data is not a prediction</h3><p>Why past results cannot guarantee a future outcome.</p></article>
          </div>
        </div>
      </section>

      <section className="section container responsible-card">
        <div>
          <span className="eyebrow">Responsible gambling</span>
          <h2>Use lottery information as entertainment, not financial advice.</h2>
        </div>
        <p>Lottery Intel presents official results and historical analysis only. It does not promise winnings, provide guaranteed selections or encourage spending beyond personal limits.</p>
      </section>
    </>
  );
}
