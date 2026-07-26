import type { Metadata } from "next";
import { SearchBox } from "@/components/SearchBox";
import { formatDrawDate, getLatestFourD } from "@/lib/results";

export const metadata: Metadata = { title: "Singapore 4D Results" };
export const revalidate = 60;

export default async function FourDPage() {
  const result = await getLatestFourD();
  const rows = result.data ?? [];
  const draw = rows[0];
  const prize = (type: string) => rows.find((row) => row.prize_type === type)?.winning_number;
  const group = (type: string) => rows.filter((row) => row.prize_type === type);
  return <div className="container page-shell"><span className="eyebrow">Singapore 4D</span><h1>Official 4D results</h1>
    {result.error ? <p className="state state-error">Results could not be loaded. Please try again later.<small>{result.error}</small></p> : !draw ? <p className="state">No published 4D result is available yet.</p> : <>
      <p className="draw-meta">Draw {draw.draw_no} · {formatDrawDate(draw.draw_date)}</p>
      <div className="data-panel top-prizes"><h2>Winning numbers</h2>{[["1st", prize("first")], ["2nd", prize("second")], ["3rd", prize("third")]].map(([label, number]) => <div className="prize-row" key={label}><span>{label} Prize</span><strong>{number}</strong></div>)}</div>
      <div className="result-sections">{[["Starter", group("starter")], ["Consolation", group("consolation")]].map(([label, numbers]) => <section className="data-panel" key={label as string}><h2>{label as string}</h2><div className="number-list">{(numbers as typeof rows).map((row) => <strong key={row.position}>{row.winning_number}</strong>)}</div></section>)}</div>
    </>}
    <div className="data-panel"><h2>Check a number</h2><SearchBox /></div></div>;
}
