import type { Metadata } from "next";
import { ArchiveFilters, DrawHeading, Pagination, SweepResults } from "@/components/Archive";
import { getArchive, getCoverage, type SweepRow } from "@/lib/results";
export const metadata: Metadata = { title: "Singapore Sweep Results Archive", description: "Browse complete published Singapore Sweep results grouped by official prize tier." };
export const dynamic = "force-dynamic";
export default async function SweepPage({ searchParams }: { searchParams: Promise<{ date?: string; draw?: string; page?: string }> }) {
  const filters = await searchParams; const [archive, coverage] = await Promise.all([getArchive<SweepRow>("sweep", filters, 5), getCoverage("sweep")]); const data = archive.data;
  return <div className="container page-shell archive-page"><span className="eyebrow">Singapore Sweep</span><h1>Singapore Sweep results archive</h1><p className="section-copy">Complete published ticket values, series and suffix details, grouped by official prize tier.</p>
    {coverage.data && <p className="coverage-note"><strong>{coverage.data.count.toLocaleString("en-SG")}</strong> published draws from {coverage.data.firstDate} to {coverage.data.lastDate}. Archive coverage may be incomplete.</p>}<ArchiveFilters date={filters.date} draw={filters.draw} />
    {archive.error ? <p className="state state-error">The archive could not be loaded. Please try again later.</p> : !data?.draws.length ? <p className="state">No published Singapore Sweep draws match these filters. Historical backfill may still be in progress.</p> : <>{data.draws.map(({ draw, rows }) => <article className="data-panel archive-draw" key={draw.id}><DrawHeading draw={draw} gamePath="singapore-sweep"><span className="row-count">{rows.length} result rows</span></DrawHeading><SweepResults rows={rows} /></article>)}<Pagination page={data.page} pageSize={data.pageSize} count={data.count} params={filters} /></>}
  </div>;
}
