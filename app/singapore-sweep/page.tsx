import type { Metadata } from "next";
import { formatDrawDate, getLatestSweep } from "@/lib/results";

export const metadata: Metadata = { title: "Big Sweep Results" };
export const revalidate = 60;

export default async function SweepPage() {
  const result = await getLatestSweep();
  const rows = result.data ?? [];
  const draw = rows[0];
  const tiers = rows.reduce((groups, row) => {
    const key = `${row.tier_code}|${row.source_label}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
    return groups;
  }, new Map<string, typeof rows>());

  return (
    <div className="container page-shell">
      <span className="eyebrow">Singapore Big Sweep</span>
      <h1>Official Big Sweep results</h1>
      {result.error ? (
        <p className="state state-error">Results could not be loaded. Please try again later.</p>
      ) : !draw ? (
        <p className="state">No published Big Sweep result is available yet.</p>
      ) : (
        <>
          <p className="draw-meta">Draw {draw.draw_no} · {formatDrawDate(draw.draw_date)}</p>
          {tiers.size === 0 ? <p className="state">Prize numbers have not been published for this draw.</p> : (
            <div className="result-sections sweep-tiers">
              {Array.from(tiers).map(([key, tierRows]) => (
                <section className="data-panel" key={key}>
                  <h2>{tierRows[0]?.source_label ?? "Prize tier"}</h2>
                  <div className="sweep-list">{tierRows.map((row) => <strong key={`${row.tier_code}-${row.position}`}>{row.source_display_value}</strong>)}</div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
