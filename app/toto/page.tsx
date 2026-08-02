import type { Metadata } from "next";
import { ArchiveFilters, DrawHeading, Pagination, TotoResults } from "@/components/Archive";
import { getArchive, getCoverage, type TotoRow } from "@/lib/results";
export const metadata: Metadata = { title: "Singapore TOTO Results Archive", description: "Browse published Singapore TOTO winning numbers by date and draw number." };
export const dynamic = "force-dynamic";
export default async function TotoPage({ searchParams }: { searchParams: Promise<{ date?: string; draw?: string; page?: string }> }) {
  const filters = await searchParams; const [archive, coverage] = await Promise.all([getArchive<TotoRow>("toto", filters), getCoverage("toto")]); const data = archive.data;
  return <div className="container page-shell archive-page"><span className="eyebrow">Singapore TOTO</span><h1>TOTO results archive</h1><p className="section-copy">An archive of published results for reference—not predictions or betting advice.</p>
    {coverage.data && <p className="coverage-note"><strong>{coverage.data.count.toLocaleString("en-SG")}</strong> published draws from {coverage.data.firstDate} to {coverage.data.lastDate}. Archive coverage may be incomplete.</p>}<ArchiveFilters date={filters.date} draw={filters.draw} />
    {archive.error ? <p className="state state-error">The archive could not be loaded. Please try again later.</p> : !data?.draws.length ? <p className="state">No published TOTO draws match these filters. Historical backfill may still be in progress.</p> : <>{data.draws.map(({ draw, rows }) => <article className="data-panel archive-draw" key={draw.id}><DrawHeading draw={draw} gamePath="toto" /><TotoResults rows={rows} /></article>)}<Pagination page={data.page} pageSize={data.pageSize} count={data.count} params={filters} /></>}
  </div>;
}
