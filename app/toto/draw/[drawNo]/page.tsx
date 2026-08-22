import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TotoResults } from "@/components/Archive";
import { formatDrawDate, getDraw, type TotoRow } from "@/lib/results";

type Props = { params: Promise<{ drawNo: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { drawNo } = await params;
  const decoded = decodeURIComponent(drawNo);
  return {
    title: `Singapore TOTO Draw ${decoded} Results | Lottery Intel`,
    description: `Singapore TOTO Draw ${decoded} winning numbers and additional number, with historical TOTO research tools from Lottery Intel.`,
  };
}

export default async function Page({ params }: Props) {
  const { drawNo } = await params;
  const result = await getDraw<TotoRow>("toto", decodeURIComponent(drawNo));
  if (!result.data) notFound();
  const { draw, rows } = result.data;

  return (
    <div className="container page-shell draw-page">
      <Link className="back-link" href="/toto">← Singapore TOTO results archive</Link>
      <span className="eyebrow">Singapore TOTO published result</span>
      <h1>TOTO Draw {draw.draw_no} Results</h1>
      <p className="draw-meta">{formatDrawDate(draw.draw_date)}</p>
      <section className="data-panel">
        <h2>Winning numbers</h2>
        <TotoResults rows={rows} />
      </section>
      <section className="data-panel">
        <span className="eyebrow">RESEARCH YOUR NEXT TOTO BET</span>
        <h2>Check your numbers with Lottery Intel</h2>
        <p>Enter the TOTO numbers you are considering to compare their historical relationships and research strength before the next draw.</p>
        <div className="button-row">
          <Link className="button primary" href="/toto/analyse">Analyse my TOTO numbers</Link>
          <Link className="button secondary" href="/toto">View more TOTO results</Link>
        </div>
        <p className="fine-print">Historical research does not predict or guarantee future winning results.</p>
      </section>
    </div>
  );
}
