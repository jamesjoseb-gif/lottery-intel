import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SearchBox } from "@/components/SearchBox";
import { buildNumberHistoryStats } from "@/lib/fourd-number";
import { formatDrawDate, getNumberHistory } from "@/lib/results";

type Props = {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ year?: string; prize?: string; page?: string }>;
};
const prizeLabels = { first: "1st Prize", second: "2nd Prize", third: "3rd Prize", starter: "Starter Prize", consolation: "Consolation Prize" } as const;
const prizes = Object.keys(prizeLabels) as Array<keyof typeof prizeLabels>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  if (!/^\d{4}$/.test(number)) return { title: "4D Number History" };
  const title = `${number} 4D Number History & Winning Results`;
  const description = `Find every published Singapore 4D win for ${number}, with prize counts, last appearance, longest gap and wins by year.`;
  return {
    title,
    description,
    alternates: { canonical: `/4d/number/${number}` },
    openGraph: { title, description, type: "article", url: `/4d/number/${number}` },
  };
}

function queryHref(number: string, filters: { year?: string; prize?: string }, page: number) {
  const query = new URLSearchParams();
  if (filters.year) query.set("year", filters.year);
  if (filters.prize) query.set("prize", filters.prize);
  if (page > 1) query.set("page", String(page));
  const value = query.toString();
  return `/4d/number/${number}${value ? `?${value}` : ""}`;
}

export default async function NumberHistoryPage({ params, searchParams }: Props) {
  const [{ number }, requested] = await Promise.all([params, searchParams]);
  if (!/^\d{4}$/.test(number)) notFound();
  const filters = {
    year: /^\d{4}$/.test(requested.year ?? "") ? requested.year : undefined,
    prize: prizes.includes(requested.prize as keyof typeof prizeLabels) ? requested.prize : undefined,
  };
  const result = await getNumberHistory(number, { ...filters, page: requested.page });
  const history = result.data;
  const appearances = history?.appearances ?? [];
  const rows = history?.rows ?? [];
  const stats = buildNumberHistoryStats(appearances);
  const years = stats.years.map(([year]) => year);
  const totalPages = Math.max(1, Math.ceil((history?.count ?? 0) / (history?.pageSize ?? 20)));
  const position = (value: number | null) => value === null ? "—" : String(value);
  const jsonLd = { "@context": "https://schema.org", "@type": "Dataset", name: `${number} Singapore 4D number history`, description: `Every published historical appearance of 4D number ${number}.`, temporalCoverage: stats.firstSeen && stats.lastSeen ? `${stats.firstSeen}/${stats.lastSeen}` : undefined };

  return <div className="container page-shell number-history-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <nav className="number-nav" aria-label="Breadcrumb"><Link href="/">Home</Link><span> / </span><Link href="/4d">4D archive</Link><span> / {number}</span></nav>
    <span className="eyebrow">Number history</span>
    <h1>{number} 4D winning history</h1>
    <p className="section-copy">Search the production results archive for every exact appearance, newest first.</p>
    <SearchBox />
    <p className="notice">Historical frequency does not predict a future result. Lottery draws are games of chance.</p>

    {result.error ? <p className="state state-error">Number history could not be loaded. Please try again later.<small>{result.error}</small></p> : <>
      <section aria-labelledby="summary-title"><h2 className="section-title" id="summary-title">Statistics for {number}</h2>
        <div className="metric-grid number-stat-grid">
          <div className="metric"><span>Total wins</span><strong>{stats.total}</strong></div>
          <div className="metric"><span>1st Prizes</span><strong>{stats.prizes.first}</strong></div>
          <div className="metric"><span>2nd Prizes</span><strong>{stats.prizes.second}</strong></div>
          <div className="metric"><span>3rd Prizes</span><strong>{stats.prizes.third}</strong></div>
          <div className="metric"><span>Starter Prizes</span><strong>{stats.prizes.starter}</strong></div>
          <div className="metric"><span>Consolation Prizes</span><strong>{stats.prizes.consolation}</strong></div>
          <div className="metric"><span>Last appearance</span><strong>{stats.lastSeen ? formatDrawDate(stats.lastSeen) : "—"}</strong></div>
          <div className="metric"><span>Longest gap between wins</span><strong>{stats.gaps.longest === null ? "—" : `${stats.gaps.longest} days`}</strong></div>
        </div>
      </section>

      <section className="data-panel year-wins" aria-labelledby="year-title"><h2 id="year-title">Wins by year</h2>
        {stats.years.length ? <div className="year-win-list">{stats.years.map(([year, count]) => <div key={year}><span>{year}</span><strong>{count}</strong></div>)}</div> : <p className="inline-state">No wins recorded.</p>}
      </section>

      <section className="data-panel" aria-labelledby="appearances-title"><div className="history-heading"><div><h2 id="appearances-title">Every occurrence</h2><p>{history?.count ?? 0} matching {history?.count === 1 ? "result" : "results"}{filters.year || filters.prize ? " after filtering" : ""}</p></div></div>
        <form className="history-filters" method="get">
          <label>Year<select name="year" defaultValue={filters.year ?? ""}><option value="">All years</option>{years.map((year) => <option value={year} key={year}>{year}</option>)}</select></label>
          <label>Prize<select name="prize" defaultValue={filters.prize ?? ""}><option value="">All prizes</option>{prizes.map((prize) => <option value={prize} key={prize}>{prizeLabels[prize]}</option>)}</select></label>
          <button type="submit">Apply filters</button>
          {(filters.year || filters.prize) && <Link href={`/4d/number/${number}`}>Clear</Link>}
        </form>
        {rows.length ? <div className="appearance-table-wrap"><table className="appearance-table"><thead><tr><th>Draw date</th><th>Draw no.</th><th>Prize type</th><th>Position</th><th>Winning number</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.draw_id}-${row.prize_type}-${row.position}`}><td>{formatDrawDate(row.draw_date)}</td><td><Link href={`/4d/draw/${encodeURIComponent(row.draw_no)}`}>{row.draw_no}</Link></td><td><span className="status-pill">{prizeLabels[row.prize_type]}</span></td><td>{position(row.position)}</td><td><strong className="history-number">{row.winning_number}</strong></td></tr>)}</tbody></table></div> : <div className="history-empty"><strong>No occurrences found</strong><p>{filters.year || filters.prize ? "Try removing a filter to see more results." : `${number} has not appeared in the published archive.`}</p></div>}
        {history && totalPages > 1 && <nav className="pagination" aria-label="Number history pages"><span>Page {history.page} of {totalPages}</span>{history.page > 1 && <Link href={queryHref(number, filters, history.page - 1)}>← Previous</Link>}{history.page < totalPages && <Link href={queryHref(number, filters, history.page + 1)}>Next →</Link>}</nav>}
      </section>
    </>}
  </div>;
}
