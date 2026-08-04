import type { Metadata } from "next";
import Link from "next/link";
import { getFourDRankings } from "@/lib/fourd-rankings-data";
import { normalizeRankingKind, normalizeRankingPeriod, type RankingKind, type RankingPeriod } from "@/lib/fourd-rankings";
import { formatDrawDate } from "@/lib/results";

export const metadata: Metadata = {
  title: "Hot & Cold 4D Number Rankings",
  description: "Compare non-predictive hot, cold, overdue and recent 4D number rankings calculated from verified published Singapore 4D results.",
  alternates: { canonical: "/4d/rankings" },
  robots: { index: true, follow: true },
};
export const revalidate = 3600;

type Props = { searchParams: Promise<{ ranking?: string; period?: string }> };
const kindLabels: Record<RankingKind, string> = { hot: "Hot", cold: "Cold", overdue: "Overdue", recent: "Recent winners" };
const periodLabels: Record<RankingPeriod, string> = { "30": "30 days", "90": "90 days", "365": "365 days", all: "All time" };
const prizeLabels = { first: "1st Prize", second: "2nd Prize", third: "3rd Prize", starter: "Starter", consolation: "Consolation" } as const;
const href = (ranking: RankingKind, period: RankingPeriod) => `/4d/rankings?ranking=${ranking}&period=${period}`;

export default async function RankingsPage({ searchParams }: Props) {
  const query = await searchParams;
  const ranking = normalizeRankingKind(query.ranking);
  const period = normalizeRankingPeriod(query.period);
  const result = await getFourDRankings(period);
  const rows = result.data?.[ranking] ?? [];
  return <main className="container page-shell rankings-page">
    <nav className="number-nav" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/4d">4D archive</Link><span>/ Rankings</span></nav>
    <span className="eyebrow">Verified archive analysis</span>
    <h1>Hot &amp; Cold 4D Number Rankings</h1>
    <p className="section-copy">Explore exact four-digit numbers ranked by deterministic measures of frequency, recency and historical gaps in published 4D results. Leading zeroes are preserved.</p>
    <aside className="rankings-warning"><strong>Historical rankings are non-predictive.</strong> Historical activity does not predict future draw results. Rankings use past published results only, and a high rank is not a recommendation to buy.</aside>

    <nav className="ranking-tabs" aria-label="Ranking type">{Object.entries(kindLabels).map(([value, label]) => <Link key={value} href={href(value as RankingKind, period)} aria-current={ranking === value ? "page" : undefined}>{label}</Link>)}</nav>
    <div className="ranking-toolbar"><div><strong>{kindLabels[ranking]}</strong><span>{rows.length} numbers · {result.rowCount.toLocaleString()} verified result rows</span></div><nav aria-label="Ranking period">{Object.entries(periodLabels).map(([value, label]) => <Link key={value} href={href(ranking, value as RankingPeriod)} aria-current={period === value ? "page" : undefined}>{label}</Link>)}</nav></div>

    {result.error ? <div className="state state-error" role="alert"><strong>Rankings could not be loaded.</strong><small>{result.error}</small></div> : rows.length === 0 ? <div className="history-empty"><strong>No ranking data available</strong><p>No published results match this ranking yet.</p></div> : <div className="ranking-table-wrap"><table className="ranking-table"><thead><tr><th>Rank</th><th>Number</th><th>Activity score</th><th>Period appearances</th><th>Last appearance</th><th>Days since</th><th>Average gap</th><th>Gap vs average</th><th>Common prize</th><th><span className="sr-only">History</span></th></tr></thead><tbody>{rows.map((item, index) => <tr key={item.number}><td data-label="Rank"><strong>#{index + 1}</strong></td><td data-label="Number"><Link className="ranked-number" href={`/4d/number/${item.number}`}>{item.number}</Link></td><td data-label="Activity score"><strong>{item.historicalActivityScore}/100</strong><small>{item.activityLabel}</small></td><td data-label={`Appearances (${periodLabels[period]})`}>{item.periodAppearances}</td><td data-label="Last appearance">{formatDrawDate(item.lastAppearance)}</td><td data-label="Days since">{item.daysSinceLastAppearance.toLocaleString()}</td><td data-label="Average gap">{item.averageHistoricalGap === null ? "—" : `${item.averageHistoricalGap.toLocaleString()} days`}</td><td data-label="Gap vs average">{item.currentGapVersusAverage === null ? "—" : `${item.currentGapVersusAverage.toFixed(2)}×`}</td><td data-label="Common prize">{prizeLabels[item.mostCommonPrizeType]}</td><td><Link className="history-link" href={`/4d/number/${item.number}`}>Full history →</Link></td></tr>)}</tbody></table></div>}

    <section className="ranking-method" aria-labelledby="method-title"><h2 id="method-title">How these historical rankings work</h2><div><article><h3>Hot</h3><p>Combines the Historical Activity Score (50%), selected-period frequency (35%) and recency (15%).</p></article><article><h3>Cold</h3><p>Orders lower period activity first, then longer absence and lower activity score. At least two historical appearances are required.</p></article><article><h3>Overdue</h3><p>Compares days since the latest appearance with that number’s own mean gap. Only ratios above 1× and numbers with at least two appearances qualify.</p></article><article><h3>Recent winners</h3><p>Orders exact numbers by their latest published appearance date, newest first.</p></article></div><p>Ties use documented secondary measures and exact number ascending, making results stable. Scores describe the archive only and are bounded from 0 to 100.</p></section>
  </main>;
}
