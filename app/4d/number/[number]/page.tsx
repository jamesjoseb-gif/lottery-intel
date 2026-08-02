import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavouriteNumberButton } from "@/components/FavouriteNumberButton";
import { adjacentFourDNumbers, buildNumberHistoryStats, relatedFourDNumbers } from "@/lib/fourd-number";
import { formatDrawDate, getNumberHistory } from "@/lib/results";

type Props = { params: Promise<{ number: string }> };
const prizeLabels = { first: "1st Prize", second: "2nd Prize", third: "3rd Prize", starter: "Starter", consolation: "Consolation" } as const;
const breakdownLabel = (value: string, type: "month" | "default") => type === "month" ? new Intl.DateTimeFormat("en-SG", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T00:00:00Z`)) : value;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  if (!/^\d{4}$/.test(number)) return { title: "4D Number History" };
  const title = `${number} 4D Number History`;
  const description = `Explore every published appearance of Singapore 4D number ${number}, including prize, gap, yearly, monthly and weekday statistics.`;
  return { title, description, alternates: { canonical: `/4d/number/${number}` }, openGraph: { title, description, type: "article", url: `/4d/number/${number}` } };
}

function Breakdown({ title, rows, type = "default" }: { title: string; rows: Array<[string, number]>; type?: "month" | "default" }) {
  return <section className="data-panel breakdown-panel"><h2>{title}</h2>{rows.length ? <div className="breakdown-list">{rows.map(([label, count]) => <div key={label}><span>{breakdownLabel(label, type)}</span><strong>{count}</strong></div>)}</div> : <p className="inline-state">No appearances to break down.</p>}</section>;
}

export default async function NumberHistoryPage({ params }: Props) {
  const { number } = await params;
  if (!/^\d{4}$/.test(number)) notFound();
  const result = await getNumberHistory(number);
  const appearances = result.data ?? [];
  const stats = buildNumberHistoryStats(appearances);
  const adjacent = adjacentFourDNumbers(number);
  const related = relatedFourDNumbers(number);
  const metric = (value: number | null, suffix = "") => value === null ? "—" : `${value.toLocaleString("en-SG")}${suffix}`;
  const jsonLd = { "@context": "https://schema.org", "@type": "Dataset", name: `${number} Singapore 4D number history`, description: `Published historical appearances and aggregate statistics for 4D number ${number}.`, variableMeasured: "Winning number appearances", temporalCoverage: stats.firstSeen && stats.lastSeen ? `${stats.firstSeen}/${stats.lastSeen}` : undefined };

  return <div className="container page-shell number-history-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <nav className="number-nav" aria-label="Number navigation"><Link href={`/4d/number/${adjacent.previous}`}>← {adjacent.previous}</Link><Link href="/4d">4D archive</Link><Link href={`/4d/number/${adjacent.next}`}>{adjacent.next} →</Link></nav>
    <div className="number-title-row"><div><span className="eyebrow">4D number history</span><h1>{number}</h1><p className="section-copy">A server-rendered profile built from published 4D results.</p></div><FavouriteNumberButton number={number} /></div>
    <p className="notice">Historical frequency and gaps do not predict a future result. Lottery draws are games of chance.</p>
    {result.error ? <p className="state state-error">Number history could not be loaded. Please try again later.<small>{result.error}</small></p> : <>
      <section aria-labelledby="summary-title"><h2 className="section-title" id="summary-title">Summary statistics</h2><div className="metric-grid history-summary">
        <div className="metric"><span>Total appearances</span><strong>{stats.total}</strong></div>
        <div className="metric"><span>First seen</span><strong>{stats.firstSeen ? formatDrawDate(stats.firstSeen) : "—"}</strong></div>
        <div className="metric"><span>Last seen</span><strong>{stats.lastSeen ? formatDrawDate(stats.lastSeen) : "—"}</strong></div>
        <div className="metric"><span>Days since last seen</span><strong>{metric(stats.daysSinceLast)}</strong></div>
        <div className="metric"><span>Average appearance gap</span><strong>{metric(stats.gaps.average, " days")}</strong></div>
        <div className="metric"><span>Shortest gap</span><strong>{metric(stats.gaps.shortest, " days")}</strong></div>
        <div className="metric"><span>Longest gap</span><strong>{metric(stats.gaps.longest, " days")}</strong></div>
      </div></section>
      <section className="data-panel"><h2>Prize distribution</h2><div className="prize-distribution">{Object.entries(prizeLabels).map(([key, label]) => <div key={key}><span>{label}</span><strong>{stats.prizes[key as keyof typeof stats.prizes]}</strong></div>)}</div></section>
      <div className="breakdown-grid"><Breakdown title="Appearances by year" rows={stats.years} /><Breakdown title="Appearances by month" rows={stats.months} type="month" /><Breakdown title="Appearances by weekday" rows={stats.weekdays} /></div>
      <section className="data-panel"><h2>Historical appearances</h2>{appearances.length ? <div className="appearance-table-wrap"><table className="appearance-table"><thead><tr><th>Date</th><th>Draw</th><th>Prize</th><th>Gap from previous</th></tr></thead><tbody>{appearances.map((row, index) => { const newer = appearances[index + 1]; const gap = newer ? Math.round((Date.parse(`${row.draw_date}T00:00:00Z`) - Date.parse(`${newer.draw_date}T00:00:00Z`)) / 86_400_000) : null; return <tr key={`${row.draw_id}-${row.prize_type}-${row.position}`}><td>{formatDrawDate(row.draw_date)}</td><td><Link href={`/4d/draw/${encodeURIComponent(row.draw_no)}`}>{row.draw_no}</Link></td><td><span className="status-pill">{prizeLabels[row.prize_type]}</span></td><td>{gap === null ? "First recorded" : `${gap} days`}</td></tr>; })}</tbody></table></div> : <p className="inline-state">No published appearances were found for {number}.</p>}</section>
    </>}
    <section className="data-panel"><h2>Related numbers</h2><p className="inline-state">Explore reversals, rotations and adjacent numbers. These links are for research, not recommendations.</p><div className="related-numbers">{related.map((item) => <Link href={`/4d/number/${item}`} key={item}>{item}</Link>)}</div></section>
  </div>;
}
