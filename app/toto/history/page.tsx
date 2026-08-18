import type { Metadata } from "next";
import Link from "next/link";
import { TotoSavedHistory } from "@/components/TotoSavedBet";
import { getArchive, type TotoRow } from "@/lib/results";

export const metadata: Metadata = {
  title: "My TOTO Research History | Lottery Intel",
  description: "Review saved TOTO research and grade it against published results.",
};

export default async function TotoHistoryPage() {
  const latest = await getArchive<TotoRow>("toto", {}, 1);
  const latestDraw = latest.data?.draws[0];
  const main = latestDraw?.rows.filter((r) => r.number_kind === "main").map((r) => r.winning_number).sort((a,b)=>a-b) ?? [];
  const additional = latestDraw?.rows.find((r) => r.number_kind === "additional")?.winning_number ?? null;
  const published = latestDraw ? { drawNo: latestDraw.draw.draw_no, drawDate: latestDraw.draw.draw_date, main, additional } : null;
  return <main className="container page-shell">
    <nav className="number-nav"><Link href="/">Home</Link><span>/</span><Link href="/toto">TOTO</Link><span>/ My History</span></nav>
    <span className="eyebrow">Personal research record</span>
    <h1>My TOTO history</h1>
    <p className="section-copy">Save research before each draw, confirm whether you actually placed it, and compare it with published TOTO results. Financial performance is only counted for entries you mark as placed.</p>
    <TotoSavedHistory latestDraw={published} />
    <aside className="rankings-warning"><strong>Privacy note:</strong> V1 records remain in this browser and may disappear if browser storage is cleared. Account syncing will replace this temporary storage for registered members.</aside>
  </main>;
}
