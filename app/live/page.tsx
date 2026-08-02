import type { Metadata } from "next";
import Link from "next/link";
import { formatDrawDate, getCoverage, type GameCode } from "@/lib/results";
export const metadata: Metadata = { title: "Results Centre", description: "Latest published Singapore 4D, TOTO and Singapore Sweep results and historical archive coverage." };
export const revalidate = 60;
const games: Array<{ code: GameCode; name: string; path: string; description: string }> = [
  { code: "4d", name: "4D", path: "/4d", description: "All top, Starter and Consolation prizes" },
  { code: "toto", name: "TOTO", path: "/toto", description: "Six main numbers and the additional number" },
  { code: "sweep", name: "Singapore Sweep", path: "/singapore-sweep", description: "Every published result grouped by prize tier" },
];
export default async function ResultsCentre() {
  const coverage = await Promise.all(games.map((game) => getCoverage(game.code)));
  return <div className="container page-shell"><span className="eyebrow">Published results</span><h1>Results Centre</h1><p className="section-copy">Browse the latest official publication and the available history for every Singapore Pools draw game.</p><p className="notice">Only current published revisions from the public results API appear here. Archive coverage can grow as verified backfills are published.</p>
    <div className="centre-grid">{games.map((game, index) => { const result = coverage[index]; const item = result.data; return <article className="data-panel centre-card" key={game.code}><h2>{game.name}</h2><p>{game.description}</p>{result.error ? <p className="state state-error">Coverage is temporarily unavailable.</p> : !item ? <p className="state">No published draws are available yet.</p> : <><dl><div><dt>Latest draw</dt><dd>{item.latest.draw_no}</dd></div><div><dt>Draw date</dt><dd>{formatDrawDate(item.latest.draw_date)}</dd></div><div><dt>Published draws</dt><dd>{item.count.toLocaleString("en-SG")}</dd></div><div><dt>Available coverage</dt><dd>{formatDrawDate(item.firstDate)} – {formatDrawDate(item.lastDate)}</dd></div></dl><small>Coverage reflects published data and may be incomplete.</small></>}<Link className="archive-link" href={game.path}>Browse {game.name} archive <span aria-hidden="true">→</span></Link></article>; })}</div>
  </div>;
}
