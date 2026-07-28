import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDrawDate, getNumberHistory } from "@/lib/results";

type Props = { params: Promise<{ number: string }> };

const prizeLabels: Record<string, string> = {
  first: "1st Prize",
  second: "2nd Prize",
  third: "3rd Prize",
  starter: "Starter",
  consolation: "Consolation",
};

function daysSince(date: string) {
  const drawDate = new Date(`${date}T00:00:00+08:00`).getTime();
  return Math.max(0, Math.floor((Date.now() - drawDate) / 86_400_000));
}

function recencyStatus(days: number | null) {
  if (days === null) return "No history";
  if (days <= 90) return "Recent";
  if (days <= 365) return "Moderate gap";
  return "Long gap";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  return { title: `${number} 4D Number Intelligence` };
}

export default async function NumberPage({ params }: Props) {
  const { number } = await params;
  if (!/^\d{4}$/.test(number)) notFound();

  const result = await getNumberHistory(number);
  const rows = result.data ?? [];
  const count = (type: string) => rows.filter((row) => row.prize_type === type).length;
  const daysSinceLastSeen = rows[0] ? daysSince(rows[0].draw_date) : null;
  const status = recencyStatus(daysSinceLastSeen);
  const metrics: Array<[string, string | number]> = [
    ["Total appearances", rows.length],
    ["1st prize", count("first")],
    ["2nd prize", count("second")],
    ["3rd prize", count("third")],
    ["Starter", count("starter")],
    ["Consolation", count("consolation")],
    ["Days since last seen", daysSinceLastSeen ?? "—"],
    ["Recency status", status],
  ];

  return (
    <div className="container page-shell">
      <span className="eyebrow">4D number profile</span>
      <h1>{number}</h1>
      <p className="notice">
        Historical results describe the past only and do not predict future draws. Recency status only describes the time since the latest recorded appearance.
      </p>

      {result.error ? (
        <p className="state state-error">
          History could not be loaded. Please try again later.
          <small>{result.error}</small>
        </p>
      ) : (
        <>
          <div className="metric-grid history-metrics">
            {metrics.map(([label, value]) => (
              <div className="metric" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <section className="data-panel">
            <h2>Last appearance</h2>
            <p className="last-appearance">
              {rows[0]
                ? `${formatDrawDate(rows[0].draw_date)} · Draw ${rows[0].draw_no} · ${prizeLabels[rows[0].prize_type]} · ${daysSinceLastSeen} days ago`
                : "This number has no appearances in the published archive."}
            </p>
          </section>

          <section className="data-panel">
            <h2>Complete appearance history</h2>
            {rows.length === 0 ? (
              <p className="last-appearance">No published appearances found.</p>
            ) : (
              rows.map((row) => (
                <div className="prize-row" key={`${row.draw_id}-${row.prize_type}-${row.position}`}>
                  <div>
                    <strong>{formatDrawDate(row.draw_date)}</strong>
                    <div className="draw-meta">Draw {row.draw_no}</div>
                  </div>
                  <span className="status-pill">{prizeLabels[row.prize_type]}</span>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
