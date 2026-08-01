import type { Metadata } from "next";
import { formatDrawDate, getLatestToto } from "@/lib/results";

export const metadata: Metadata = { title: "Singapore TOTO Results" };
export const revalidate = 60;

export default async function TotoPage() {
  const result = await getLatestToto();
  const rows = result.data ?? [];
  const draw = rows[0];
  const mainNumbers = rows.filter((row) => row.number_kind === "main");
  const additional = rows.find((row) => row.number_kind === "additional");

  return (
    <div className="container page-shell">
      <span className="eyebrow">Singapore TOTO</span>
      <h1>Official TOTO results</h1>
      {result.error ? (
        <p className="state state-error">Results could not be loaded. Please try again later.</p>
      ) : !draw ? (
        <p className="state">No published TOTO result is available yet.</p>
      ) : (
        <section className="data-panel">
          <p className="draw-meta">Draw {draw.draw_no} · {formatDrawDate(draw.draw_date)}</p>
          <h2>Winning numbers</h2>
          {mainNumbers.length ? (
            <div className="number-balls large">{mainNumbers.map((row) => <b key={row.position}>{row.winning_number}</b>)}</div>
          ) : (
            <p className="state">Main numbers have not been published for this draw.</p>
          )}
          <div className="additional-number"><span>Additional number</span><strong>{additional?.winning_number ?? "—"}</strong></div>
        </section>
      )}
    </div>
  );
}
