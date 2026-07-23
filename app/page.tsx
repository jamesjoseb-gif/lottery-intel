import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { latestResults } from "@/lib/mock-data";

const intelligenceItems = [
  ["Appearance history", "See every official draw in which a 4D number appeared."],
  ["Prize breakdown", "Separate 1st, 2nd, 3rd, Starter and Consolation results."],
  ["Gap analysis", "Track current gaps, longest gaps and draw-to-draw intervals."],
  ["Digit patterns", "Review each digit by position, frequency and historical spread."],
];

const recentSearches = ["1234", "8888", "2026", "0001", "6789"];

export default function HomePage() {
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
              <div className="status-pill">Data connection in progress</div>
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
