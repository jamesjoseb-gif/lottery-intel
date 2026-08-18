import type { Metadata } from "next";
import Link from "next/link";
import {
  formatDrawDate,
  getLatestFourD,
  getLatestToto,
  getLatestSweep,
} from "@/lib/results";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Lottery Intel — 4D & TOTO Research Tools",
  description: "Research your 4D and TOTO numbers before a draw with historical statistics, relationship analysis and budget-aware strategy tools.",
};

const prizeLabel = { first: "1st", second: "2nd", third: "3rd" } as const;

export default async function HomePage() {
  const [fourD, toto, sweep] = await Promise.all([getLatestFourD(), getLatestToto(), getLatestSweep()]);
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
          <span className="eyebrow">Independent lottery research & statistics</span>
          <h1>Research your numbers before the draw.</h1>
          <p className="hero-copy">Tell Lottery Intel what you want to play and the maximum you are prepared to spend. We analyse historical results, number relationships and available entry structures to help you build a more informed 4D or TOTO strategy.</p>
          <div className="hero-actions">
            <Link className="primary-link" href="/toto/analyse">Analyse my TOTO bet →</Link>
            <Link className="secondary-link" href="/4d/strategy">Build my 4D strategy →</Link>
          </div>
          <p className="coverage-note">Historical research does not change random draw mechanics or guarantee a future win. Your budget is treated as a maximum, not an amount that must be spent.</p>
        </div>
        <aside className="hero-dashboard" aria-label="How Lottery Intel helps">
          <div className="dashboard-label">Start with your goal</div>
          <div className="prize-row"><span>Already have numbers?</span><strong>Score them</strong></div>
          <div className="prize-row"><span>No numbers in mind?</span><strong>Build a strategy</strong></div>
          <div className="prize-row"><span>Know your budget?</span><strong>Optimise deployment</strong></div>
          <Link className="dashboard-link" href="/toto/analyse">Try TOTO research →</Link>
        </aside>
      </div>
    </section>

    <section className="section container" aria-labelledby="choose-intelligence">
      <div className="section-heading"><div><span className="eyebrow">Choose your research journey</span><h2 id="choose-intelligence">What do you want help with?</h2></div></div>
      <div className="game-grid">
        <Journey href="/4d/strategy" index="01" name="4D Intelligence" copy="Analyse favourite numbers, compare Exact/System/iBet structures and build a strategy around your budget." />
        <Journey href="/toto/analyse?mode=match2" index="02" name="TOTO Match 2" copy="Research exact pair relationships and identify a small number of stronger historical pair candidates." />
        <Journey href="/toto/analyse?mode=match3" index="03" name="TOTO Match 3" copy="Analyse triple relationships using our experimental 180/210-day consensus research model." />
        <Journey href="/toto/analyse?mode=match4" index="04" name="TOTO Match 4" copy="Explore high-variance quadruple relationships with clear risk and historical evidence labels." />
        <Journey href="/toto/analyse?mode=system" index="05" name="TOTO Standard / System" copy="Score a candidate number pool and compare System sizes without assuming a larger System is automatically better." />
        <Journey href="/toto/analyse" index="06" name="Analyse My Own Numbers" copy="Enter the numbers you already intend to buy and get a research score, strengths, weaknesses and alternatives." />
      </div>
    </section>

    <section className="section soft-section"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">Before every draw</span><h2>Already have numbers in mind?</h2></div></div>
      <div className="intelligence-layout">
        <div>
          <p className="section-copy">Instead of throwing away your favourite numbers, let Lottery Intel research them. We score the individual numbers and, more importantly, the pair, triple or quadruple relationships inside your intended bet.</p>
          <Link className="primary-link" href="/toto/analyse">Analyse my TOTO numbers →</Link>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:16}}>
          <Feature title="Research Score" copy="Relative historical strength, never a % chance of winning." />
          <Feature title="Strongest relationships" copy="See which parts of your own ticket have the strongest historical support." />
          <Feature title="AI alternatives" copy="Compare your selection with research-based substitutes while keeping your favourites." />
          <Feature title="Budget recommendation" copy="AI may recommend spending less than your stated maximum." />
        </div>
      </div>
    </div></section>

    <section className="section container"><div className="section-heading"><div><span className="eyebrow">Latest published results</span><h2>Check the draw, then research the next one</h2></div><Link href="/live">Open Results Centre →</Link></div>
      <div className="result-grid">
        <article className="result-card featured"><CardHeading game="4D" draw={latestFourD} />{fourD.error ? <SafeState error /> : !latestFourD ? <SafeState /> : <>{(["first", "second", "third"] as const).map((type) => <div className="prize-row" key={type}><span>{prizeLabel[type]} Prize</span><strong>{topPrize(type) ?? "—"}</strong></div>)}<Link href="/4d">View full 4D result →</Link></>}</article>
        <article className="result-card"><CardHeading game="TOTO" draw={latestToto} />{toto.error ? <SafeState error /> : !latestToto ? <SafeState /> : <><div className="number-balls" aria-label="Six main numbers">{totoRows.filter((row) => row.number_kind === "main").map((row) => <b key={row.position}>{row.winning_number}</b>)}</div><p>Additional number: <strong>{totoRows.find((row) => row.number_kind === "additional")?.winning_number ?? "—"}</strong></p><Link href="/toto">View full TOTO result →</Link></>}</article>
        <article className="result-card"><CardHeading game="Singapore Sweep" draw={latestSweep} />{sweep.error ? <SafeState error /> : !latestSweep ? <SafeState /> : <>{(["first", "second", "third"] as const).map((type) => <div className="prize-row" key={type}><span>{prizeLabel[type]} Prize</span><strong>{sweepRows.find((row) => row.tier_code === type)?.source_display_value ?? "—"}</strong></div>)}<Link href="/singapore-sweep">View full Sweep result →</Link></>}</article>
      </div>
    </section>

    <section className="section soft-section"><div className="container"><div className="section-heading"><div><span className="eyebrow">Why join</span><h2>Use the research every time you plan to play</h2></div></div>
      <div className="steps-grid">
        <Info title="Free preview" copy="Try a basic analysis and see how the scoring works before creating an account." />
        <Info title="Saved favourites" copy="Members can save intended numbers and re-analyse them before future draws." />
        <Info title="Full AI alternatives" copy="Compare your own bets with higher-ranked relationship candidates and budget scenarios." />
        <Info title="Track results" copy="Save a strategy before the draw and grade its actual financial result afterwards." />
      </div>
      <aside className="responsible-card"><div><span className="eyebrow">Independent research</span><h2>Statistics, not a promise</h2></div><p>Lottery Intel provides independent historical research and analysis. We do not accept or facilitate bets and are not affiliated with Singapore Pools. Historical results and research scores do not guarantee future outcomes.</p></aside>
    </div></section>
  </>;
}

function Feature({title,copy}:{title:string;copy:string}) { return <article style={{padding:"20px 22px",border:"1px solid #c9d8ee",borderRadius:16,background:"#fff",boxShadow:"0 8px 24px rgba(7,26,54,.05)"}}><strong style={{display:"block",color:"#1748c9",fontSize:20,lineHeight:1.2,marginBottom:8}}>{title}</strong><span style={{display:"block",color:"#334155",fontSize:15,lineHeight:1.55}}>{copy}</span></article>; }
function SafeState({ error = false }: { error?: boolean }) { return <p className={`state${error ? " state-error" : ""}`}>{error ? "Data is temporarily unavailable. Please try again later." : "No published result is available yet."}</p>; }
function CardHeading({ game, draw }: { game: string; draw?: { draw_no: string; draw_date: string } }) { return <div className="card-top"><span>{game}</span>{draw && <small>Draw {draw.draw_no}<br />{formatDrawDate(draw.draw_date)}</small>}</div>; }
function Journey({ href, index, name, copy }: { href: string; index: string; name: string; copy: string }) { return <Link href={href}><span>{index}</span><h3>{name}</h3><p>{copy}</p><strong>Start research →</strong></Link>; }
function Info({ title, copy }: { title: string; copy: string }) { return <article><span aria-hidden="true">✓</span><h3>{title}</h3><p>{copy}</p></article>; }
