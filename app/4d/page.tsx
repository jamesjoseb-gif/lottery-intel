import type { Metadata } from "next";
import { ArchiveFilters, DrawHeading, FourDResults, Pagination } from "@/components/Archive";
import { getArchive, getCoverage, type FourDRow } from "@/lib/results";
export const metadata: Metadata = { title: "Singapore 4D Results Archive", description: "Browse published Singapore 4D results by draw date or draw number." };
export const dynamic = "force-dynamic";
export default async function FourDPage({ searchParams }: { searchParams: Promise<{ date?: string; draw?: string; page?: string }> }) {
  const filters = await searchParams; const [archive, coverage] = await Promise.all([getArchive<FourDRow>("4d", filters), getCoverage("4d")]); const data = archive.data;
  return <div className="container page-shell archive-page"><span className="eyebrow">Singapore 4D</span><h1>4D results archive</h1><p className="section-copy">Published results only. Every winning number links to its historical appearances.</p>
    {coverage.data && <p className="coverage-note"><strong>{coverage.data.count.toLocaleString("en-SG")}</strong> published draws from {coverage.data.firstDate} to {coverage.data.lastDate}. Archive coverage may be incomplete.</p>}
    <ArchiveFilters date={filters.date} draw={filters.draw} />
    {archive.error ? <p className="state state-error">The archive could not be loaded. Please try again later.</p> : !data?.draws.length ? <p className="state">No published 4D draws match these filters.</p> : <>{data.draws.map(({ draw, rows }) => <article className="data-panel archive-draw" key={draw.id}><DrawHeading draw={draw} gamePath="4d" /><FourDResults rows={rows} /></article>)}<Pagination page={data.page} pageSize={data.pageSize} count={data.count} params={filters} /></>}
  </div>;
}
