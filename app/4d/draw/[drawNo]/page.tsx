import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FourDResults } from "@/components/Archive";
import { formatDrawDate, getDraw, type FourDRow } from "@/lib/results";

type Props = { params: Promise<{ drawNo: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { drawNo } = await params;
  const decoded = decodeURIComponent(drawNo);
  return {
    title: `Singapore 4D Draw ${decoded} Results | Lottery Intel`,
    description: `Full Singapore 4D Draw ${decoded} results including 1st, 2nd, 3rd, Starter and Consolation prizes, plus historical 4D research tools from Lottery Intel.`,
  };
}

export default async function Page({ params }: Props) {
  const { drawNo } = await params;
  const result = await getDraw<FourDRow>("4d", decodeURIComponent(drawNo));
  if (!result.data) notFound();
  const { draw, rows } = result.data;

  return (
    <div className="container page-shell draw-page">
      <Link className="back-link" href="/4d">← Singapore 4D results archive</Link>
      <span className="eyebrow">Singapore 4D published result</span>
      <h1>4D Draw {draw.draw_no} Results</h1>
      <p className="draw-meta">{formatDrawDate(draw.draw_date)}</p>
      <section className="data-panel">
        <h2>Full winning results</h2>
        <FourDResults rows={rows} />
      </section>
      <section className="data-panel">
        <span className="eyebrow">CHECK & RESEARCH</span>
        <h2>Check a 4D number, then research the next draw</h2>
        <p>Use Lottery Intel to check a 4D number's historical appearances or build a budget-aware 4D research strategy for the next draw.</p>
        <div className="button-row">
          <Link className="button primary" href="/4d">Check my 4D number</Link>
          <Link className="button secondary" href="/4d/strategy">Build my 4D strategy</Link>
        </div>
        <p className="fine-print">Historical results and research do not predict or guarantee future winning results.</p>
      </section>
    </div>
  );
}
