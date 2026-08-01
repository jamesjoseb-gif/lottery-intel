import type { Metadata } from "next";
import Link from "next/link";
import { formatDrawDate, getFourDStatistics } from "@/lib/results";

export const metadata: Metadata = { title: "4D Number Statistics" };
export const revalidate = 300;

export default async function StatisticsPage() {
  const result = await getFourDStatistics();
  const rows = result.data ?? [];

  return (
    <div className="container page-shell">
      <span className="eyebrow">Historical 4D data</span>
      <h1>4D number statistics</h1>
      <p className="notice">Counts reflect published results in the database. Frequency is historical context, not a forecast.</p>
      {result.error ? <p className="state state-error">Statistics could not be loaded. Please try again later.</p> : rows.length === 0 ? (
        <p className="state">No published 4D statistics are available yet.</p>
      ) : (
        <div className="data-panel table-scroll">
          <table className="statistics-table">
            <thead><tr><th>Number</th><th>Appearances</th><th>Top prizes</th><th>Starter</th><th>Consolation</th><th>Last seen</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row.winning_number}>
                <td><Link href={`/number/${row.winning_number}`}>{row.winning_number}</Link></td>
                <td>{row.appearances}</td><td>{row.first_prizes + row.second_prizes + row.third_prizes}</td>
                <td>{row.starter_prizes}</td><td>{row.consolation_prizes}</td><td>{formatDrawDate(row.last_seen_on)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
