import type { Metadata } from "next";
import Link from "next/link";
import { formatDrawDate, getFourDRankings } from "@/lib/results";
import { normalizeRankingPeriod, normalizeRankingTab, rankFourDNumbers, rankingPeriods, rankingTabs } from "@/lib/fourd-rankings";

export const metadata: Metadata = { title: "4D Number Statistics" };
export const revalidate = 3600;

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ tab?: string; period?: string }> }) {
  const params = await searchParams;
  const tab = normalizeRankingTab(params.tab);
  const period = normalizeRankingPeriod(params.period);
  const result = await getFourDRankings();
  const rows = rankFourDNumbers(result.data ?? [], tab, period);

  return (
    <div className="container page-shell">
      <span className="eyebrow">Historical 4D data</span>
      <h1>Hot / Cold 4D Rankings</h1>
      <p className="notice">Rankings describe published historical results only. Every draw is random; frequency and gaps do not predict a future result. Play responsibly.</p>
      <nav className="ranking-controls" aria-label="Ranking type">{rankingTabs.map((value) => <Link className={tab === value ? "active" : ""} key={value} href={`/statistics?tab=${value}&period=${period}`}>{value === "recent" ? "Recent winners" : value[0].toUpperCase() + value.slice(1)}</Link>)}</nav>
      <nav className="ranking-controls periods" aria-label="Ranking period">{rankingPeriods.map((value) => <Link className={period === value ? "active" : ""} key={value} href={`/statistics?tab=${tab}&period=${value}`}>{value === "all" ? "All time" : `${value} days`}</Link>)}</nav>
      {result.error ? <p className="state state-error">Statistics could not be loaded. Please try again later.</p> : rows.length === 0 ? (
        <p className="state">No published 4D statistics are available yet.</p>
      ) : (
        <div className="data-panel table-scroll">
          <table className="statistics-table">
            <thead><tr><th>Number</th><th>Period</th><th>Total</th><th>Current gap</th><th>Avg gap</th><th>Gap ratio</th><th>Common prize</th><th>Activity</th><th>Last seen</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row.winning_number}>
                <td><Link href={`/number/${row.winning_number}`}>{row.winning_number}</Link></td>
                <td>{row.periodAppearances}</td><td>{row.total_appearances}</td><td>{row.current_gap} days</td>
                <td>{row.average_historical_gap ?? "—"}</td><td>{row.current_gap_to_average_ratio ?? "—"}</td>
                <td>{row.most_common_prize_type}</td><td>{row.activityScore}/100</td><td>{formatDrawDate(row.last_appearance)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
