import type { Metadata } from "next";
import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import {
  formatDrawDate,
  getFourDCoverage,
  getFourDStatistics,
  getLatestFourD,
  getLatestSweep,
  getLatestToto,
  getRecentFourDDraws,
} from "@/lib/results";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Singapore 4D, TOTO & Sweep Results and Number History",
  description: "Search Singapore 4D number history and browse published 4D, TOTO and Singapore Sweep results with verified historical statistics.",
};

const prizeLabel = { first: "1st", second: "2nd", third: "3rd" } as const;

export default async function HomePage() {
  const [fourD, toto, sweep, recent, statistics, coverage] = await Promise.all([
    getLatestFourD(), getLatestToto(), getLatestSweep(), getRecentFourDDraws(5), getFourDStatistics(6), getFourDCoverage(),
  ]);
  const fourDRows = fourD.data ?? [];
  const totoRows = toto.data ?? [];
  const sweepRows = sweep.data ?? [];
  const latestFourD = fourDRows[0];
  const latestToto = totoRows[0];
  const latestSweep = sweepRows[0];
  const topPrize = (type: "first" | "second" | "third") => fourDRows.find((row) => row.prize_type === type)?.winning_number;

  return <>
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <span className="eyebrow">Singapore lottery results</span>
          <h1>Look up the numbers. Understand their history.</h1>
          <p className="hero-copy">Explore published 4D, TOTO and Singapore Sweep results, then research any 4D number in the historical record. Past results never predict a future draw.</p>
          <SearchBox />
        </div>
        <aside className="hero-dashboard" aria-label="Latest 4D result">
          <div className="dashboard-label">Latest published 4D draw</div>
          {fourD.error ? <SafeState error /> : !latestFourD ? <SafeState /> : <>
            <p className="draw-meta">Draw {latestFourD.draw_no} · {formatDrawDate(latestFourD.draw_date)}</p>
            {(["first", "second", "third"] as const).map((type) => <div className="prize-row" key={type}><span>{prizeLabel[type]} Prize</span><strong>{topPrize(type) ?? "—"}</strong></div>)}
            <Link className="dashboard-link" href="/4d">See the complete result →</Link>
          </>}
        </aside>
      </div>
    </section>

    <section className="section container" aria-labelledby="latest-results">
      <div className="section-heading"><div><span className="eyebrow">Just published</span><h2 id="latest-results">Latest results</h2></div><Link href="/live">Open Results Centre →</Link></div>
      <div className="result-grid">
        <article className="result-card featured"><CardHeading game="4D" draw={latestFourD} />{fourD.error ? <SafeState error /> : !latestFourD ? <SafeState /> : <>{(["first", "second", "third"] as const).map((type) => <div className="prize-row" key={type}><span>{prizeLabel[type]} Prize</span><strong>{topPrize(type) ?? "—"}</strong></div>)}<Link href="/4d">View full 4D result →</Link></>}</article>
        <article className="result-card"><CardHeading game="TOTO" draw={latestToto} />{toto.error ? <SafeState error /> : !latestToto ? <SafeState /> : <><div className="number-balls" aria-label="Six main numbers">{totoRows.filter((row) => row.number_kind === "main").map((row) => <b key={row.position}>{row.winning_number}</b>)}</div><p>Additional number: <strong>{totoRows.find((row) => row.number_kind === "additional")?.winning_number ?? "—"}</strong></p><Link href="/toto">View full TOTO result →</Link></>}</article>
        <article className="result-card"><CardHeading game="Singapore Sweep" draw={latestSweep} />{sweep.error ? <SafeState error /> : !latestSweep ? <SafeState /> : <>{(["first", "second", "third"] as const).map((type) => <div className="prize-row" key={type}><span>{prizeLabel[type]} Prize</span><strong>{sweepRows.find((row) => row.tier_code === type)?.source_display_value ?? "—"}</strong></div>)}<Link href="/singapore-sweep">View full Sweep result →</Link></>}</article>
      </div>
    </section>

    <section className="section soft-section" aria-labelledby="recent-results"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">Published archive</span><h2 id="recent-results">Recent 4D results</h2></div><Link href="/4d">View complete latest draw →</Link></div>
      {recent.error ? <SafeState error /> : !recent.data?.length ? <SafeState /> : <div className="recent-grid">{recent.data.map((draw) => <article className="recent-card" key={draw.draw_id}><div><h3>Draw {draw.draw_no}</h3><p>{formatDrawDate(draw.draw_date)}</p></div><dl><div><dt>1st</dt><dd>{draw.first ?? "—"}</dd></div><div><dt>2nd</dt><dd>{draw.second ?? "—"}</dd></div><div><dt>3rd</dt><dd>{draw.third ?? "—"}</dd></div></dl><Link href="/4d" aria-label={`View result for draw ${draw.draw_no}`}>View result →</Link></article>)}</div>}
    </div></section>

    <section className="section intelligence-section" aria-labelledby="statistics-preview"><div className="container intelligence-layout">
      <div><span className="eyebrow">Verified historical context</span><h2 id="statistics-preview">4D statistics preview</h2><p className="section-copy">Most frequent numbers in published results, including recent appearances and First Prize counts. These are historical observations—not predictions or guaranteed picks.</p><p className="coverage">Coverage: {coverage.data ? `${formatDrawDate(coverage.data.firstDate)} to ${formatDrawDate(coverage.data.lastDate)}` : "published records currently available"}</p><Link className="primary-link" href="/statistics">Explore all 4D statistics →</Link></div>
      {statistics.error ? <SafeState error /> : !statistics.data?.length ? <SafeState /> : <div className="stats-preview">{statistics.data.map((row) => <Link href={`/number/${row.winning_number}`} key={row.winning_number}><strong>{row.winning_number}</strong><span>{row.appearances} appearances</span><span>{row.first_prizes} First Prize</span><small>Last seen {formatDrawDate(row.last_seen_on)}</small></Link>)}</div>}
    </div></section>

    <section className="section container research-section"><div><span className="eyebrow">Number research</span><h2>Research any 4D number</h2><p className="section-copy">Search every number from 0000 to 9999 and review its First, Second, Third, Starter and Consolation prize history. Leading zeroes are preserved.</p></div><div className="example-links"><span>Try an example</span>{["0000", "0123", "1234", "8888"].map((number) => <Link href={`/number/${number}`} key={number}>{number}</Link>)}</div></section>

    <section className="section soft-section"><div className="container"><div className="section-heading"><div><span className="eyebrow">Browse by game</span><h2>Published results by game</h2></div></div><div className="game-grid"><GameLink href="/4d" index="01" name="4D" copy="All 23 official prize positions, from First Prize through Starter and Consolation." /><GameLink href="/toto" index="02" name="TOTO" copy="The six main winning numbers and additional number from the latest published draw." /><GameLink href="/singapore-sweep" index="03" name="Big Sweep" copy="Published ticket numbers organised clearly by official prize tier." /></div></div></section>

    <section className="section container"><div className="section-heading"><div><span className="eyebrow">Transparent by design</span><h2>How Lottery Intel works</h2></div></div><div className="steps-grid"><Info title="Published official results" copy="Only published draw revisions are displayed." /><Info title="Historical number lookup" copy="Search a 4D number and review where and when it appeared." /><Info title="Frequency analysis" copy="Compare verified counts across the available 4D history." /><Info title="Automatic updates" copy="Results update after a new draw has been published." /></div><aside className="responsible-card"><div><span className="eyebrow">Use statistics responsibly</span><h2>An archive, not a promise</h2></div><p>Lottery Intel is an informational results archive and statistics tool. Historical frequency does not influence a future random draw and does not guarantee winning results. Never treat past results as prediction certainty.</p></aside></section>
  </>;
}

function SafeState({ error = false }: { error?: boolean }) { return <p className={`state${error ? " state-error" : ""}`}>{error ? "Data is temporarily unavailable. Please try again later." : "No published result is available yet."}</p>; }
function CardHeading({ game, draw }: { game: string; draw?: { draw_no: string; draw_date: string } }) { return <div className="card-top"><span>{game}</span>{draw && <small>Draw {draw.draw_no}<br />{formatDrawDate(draw.draw_date)}</small>}</div>; }
function GameLink({ href, index, name, copy }: { href: string; index: string; name: string; copy: string }) { return <Link href={href}><span>{index}</span><h3>{name}</h3><p>{copy}</p><strong>View {name} results →</strong></Link>; }
function Info({ title, copy }: { title: string; copy: string }) { return <article><span aria-hidden="true">✓</span><h3>{title}</h3><p>{copy}</p></article>; }
