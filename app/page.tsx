import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { formatDrawDate, getLatestFourD } from "@/lib/results";

export const revalidate = 60;

export default async function HomePage() {
  const latest = await getLatestFourD();
  const rows = latest.data ?? [];
  const draw = rows[0];

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Singapore lottery results</span>
            <h1>Look up the numbers. Understand their history.</h1>
            <p className="hero-copy">
              Explore published 4D, TOTO and Big Sweep results, then check any 4D
              number against the historical record. Past results never predict a future draw.
            </p>
            <SearchBox />
          </div>
          <aside className="hero-dashboard" aria-label="Latest 4D result">
            <div className="dashboard-label">Latest published 4D draw</div>
            {latest.error ? (
              <p className="state state-error">The latest result is temporarily unavailable.</p>
            ) : !draw ? (
              <p className="state">No published 4D result is available yet.</p>
            ) : (
              <>
                <p className="draw-meta">Draw {draw.draw_no} · {formatDrawDate(draw.draw_date)}</p>
                {(["first", "second", "third"] as const).map((type) => (
                  <div className="prize-row" key={type}>
                    <span>{type === "first" ? "1st" : type === "second" ? "2nd" : "3rd"} Prize</span>
                    <strong>{rows.find((row) => row.prize_type === type)?.winning_number ?? "—"}</strong>
                  </div>
                ))}
                <Link className="dashboard-link" href="/4d">See the complete result →</Link>
              </>
            )}
          </aside>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading">
          <div><span className="eyebrow">Browse by game</span><h2>Published results and statistics</h2></div>
        </div>
        <div className="game-grid">
          <Link href="/4d"><span>01</span><h3>4D</h3><p>All 23 prize positions in the latest published draw.</p><strong>View 4D →</strong></Link>
          <Link href="/toto"><span>02</span><h3>TOTO</h3><p>Main and additional numbers with a safe empty state when data is unavailable.</p><strong>View TOTO →</strong></Link>
          <Link href="/singapore-sweep"><span>03</span><h3>Big Sweep</h3><p>Published ticket numbers grouped by official prize tier.</p><strong>View Big Sweep →</strong></Link>
        </div>
        <p className="notice home-notice">
          Lottery Intel is an informational archive, not a prediction or betting service. <Link href="/statistics">Explore 4D statistics →</Link>
        </p>
      </section>
    </>
  );
}
