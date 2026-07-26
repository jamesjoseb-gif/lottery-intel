import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDrawDate, getNumberHistory } from "@/lib/results";

type Props = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  return { title: `${number} 4D Number Intelligence` };
}

export default async function NumberPage({ params }: Props) {
  const { number } = await params;
  if (!/^\d{4}$/.test(number)) notFound();
  const result = await getNumberHistory(number); const rows = result.data ?? [];
  const count = (type: string) => rows.filter((row) => row.prize_type === type).length;
  const metrics = [["Total appearances", rows.length], ["1st prize", count("first")], ["2nd prize", count("second")], ["3rd prize", count("third")], ["Starter", count("starter")], ["Consolation", count("consolation")]];
  return <div className="container page-shell"><span className="eyebrow">4D number profile</span><h1>{number}</h1><p className="notice">Historical results describe the past only and do not predict future draws.</p>{result.error ? <p className="state state-error">History could not be loaded. Please try again later.<small>{result.error}</small></p> : <><div className="metric-grid history-metrics">{metrics.map(([label, value]) => <div className="metric" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="data-panel"><h2>Last appearance</h2><p className="last-appearance">{rows[0] ? `${formatDrawDate(rows[0].draw_date)} · Draw ${rows[0].draw_no} · ${rows[0].prize_type}` : "This number has no appearances in the published archive."}</p></div></>}</div>;
}
