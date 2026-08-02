import Link from "next/link";
import { formatDrawDate, groupSweepTiers, type FourDRow, type PublishedDraw, type SweepRow, type TotoRow } from "@/lib/results";

export function ArchiveFilters({ date, draw }: { date?: string; draw?: string }) {
  return <form className="archive-filters" method="get" aria-label="Filter historical draws">
    <label>Draw date<input name="date" type="date" defaultValue={date} /></label>
    <label>Draw number<input name="draw" type="search" defaultValue={draw} placeholder="Search draw number" /></label>
    <button type="submit">Apply filters</button><Link href="?">Clear</Link>
  </form>;
}

export function Pagination({ page, pageSize, count, params }: { page: number; pageSize: number; count: number; params: { date?: string; draw?: string } }) {
  const href = (next: number) => { const query = new URLSearchParams(); if (params.date) query.set("date", params.date); if (params.draw) query.set("draw", params.draw); query.set("page", String(next)); return `?${query}`; };
  const last = Math.max(1, Math.ceil(count / pageSize));
  if (last === 1) return null;
  return <nav className="pagination" aria-label="Archive pages"><span>Page {page} of {last}</span>{page > 1 && <Link href={href(page - 1)}>Previous</Link>}{page < last && <Link href={href(page + 1)}>Next</Link>}</nav>;
}

export function FourDResults({ rows }: { rows: FourDRow[] }) {
  const one = (type: FourDRow["prize_type"]) => rows.find((row) => row.prize_type === type);
  const NumberLink = ({ row }: { row?: FourDRow }) => row ? <Link className="winning-number" href={`/number/${row.winning_number}`}>{row.winning_number}</Link> : <span>—</span>;
  return <div className="draw-results"><div className="top-prize-grid">{(["first", "second", "third"] as const).map((type) => <div key={type}><span>{type[0].toUpperCase() + type.slice(1)} prize</span><NumberLink row={one(type)} /></div>)}</div>
    {(["starter", "consolation"] as const).map((type) => <section key={type}><h3>{type[0].toUpperCase() + type.slice(1)}</h3><div className="number-list">{rows.filter((row) => row.prize_type === type).map((row) => <NumberLink row={row} key={`${type}-${row.position}`} />)}</div></section>)}</div>;
}

export function TotoResults({ rows }: { rows: TotoRow[] }) {
  const main = rows.filter((row) => row.number_kind === "main").sort((a, b) => a.position - b.position);
  const additional = rows.find((row) => row.number_kind === "additional");
  return <div className="toto-result"><div className="number-balls large" aria-label="Six main winning numbers">{main.map((row) => <b key={row.position}>{row.winning_number}</b>)}</div><div className="additional-number"><span>Additional number</span><strong>{additional?.winning_number ?? "—"}</strong></div>{main.length !== 6 || !additional ? <p className="inline-state">This published draw contains limited result data.</p> : null}</div>;
}

export function SweepResults({ rows }: { rows: SweepRow[] }) {
  const tiers = groupSweepTiers(rows);
  return <div className="sweep-tier-list">{tiers.map((tier, index) => <details key={tier.code} open={index < 3}><summary><span>{tier.label}</span><small>{tier.rows.length} {tier.rows.length === 1 ? "result" : "results"}</small></summary><div className="sweep-list">{tier.rows.map((row) => <div className="sweep-entry" key={`${tier.code}-${row.position}`}><strong>{row.source_display_value}</strong>{(row.series || row.entry_suffix) && <small>{row.series && `Series ${row.series}`}{row.series && row.entry_suffix && " · "}{row.entry_suffix && `Suffix ${row.entry_suffix}`}</small>}</div>)}</div></details>)}</div>;
}

export function DrawHeading({ draw, gamePath, children }: { draw: PublishedDraw; gamePath: string; children?: React.ReactNode }) {
  return <header className="archive-draw-heading"><div><h2>Draw {draw.draw_no}</h2><p>{formatDrawDate(draw.draw_date)}</p></div>{children}<Link href={`/${gamePath}/draw/${encodeURIComponent(draw.draw_no)}`}>View draw</Link></header>;
}
