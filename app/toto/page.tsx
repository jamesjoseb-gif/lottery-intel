import type { Metadata } from "next";
import { ArchiveFilters, DrawHeading, Pagination, TotoResults } from "@/components/Archive";
import { TotoQuickCheck } from "@/components/ResultResearchFunnel";
import { getArchive, getCoverage, type TotoRow } from "@/lib/results";
export const metadata: Metadata = { title: "Singapore TOTO Results Today & Archive", description: "Check the latest Singapore TOTO result, browse past draws and analyse the numbers you played." };
export const dynamic = "force-dynamic";
export default async function TotoPage({ searchParams }: { searchParams: Promise<{ date?: string; draw?: string; page?: string }> }) {
  const filters = await searchParams; const [archive, coverage] = await Promise.all([getArchive<TotoRow>("toto", filters), getCoverage("toto")]); const data = archive.data;
  return <div className="container page-shell archive-page"><span className="eyebrow">Singapore TOTO results</span><h1>Singapore TOTO results today & archive</h1><p className="section-copy">Check the latest published winning numbers first, then enter the numbers you played to continue directly into Lottery Intel research.</p>
    {archive.error ? <p className="state state-error">The archive could not be loaded. Please try again later.</p> : !data?.draws.length ? <p className="state">No published TOTO draws match these filters. Historical backfill may still be in progress.</p> : <article className="data-panel archive-draw" key={data.draws[0].draw.id}><DrawHeading draw={data.draws[0].draw} gamePath="toto" /><TotoResults rows={data.draws[0].rows} /></article>}
    <TotoQuickCheck />
    {coverage.data && <p className="coverage-note"><strong>{coverage.data.count.toLocaleString("en-SG")}</strong> published draws from {coverage.data.firstDate} to {coverage.data.lastDate}. Archive coverage may be incomplete.</p>}<ArchiveFilters date={filters.date} draw={filters.draw} />
    {archive.error ? null : !data?.draws.length ? null : <>{data.draws.slice(1).map(({ draw, rows }) => <article className="data-panel archive-draw" key={draw.id}><DrawHeading draw={draw} gamePath="toto" /><TotoResults rows={rows} /></article>)}<Pagination page={data.page} pageSize={data.pageSize} count={data.count} params={filters} /></>}
  </div>;
}
