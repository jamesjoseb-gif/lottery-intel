import type { Metadata } from "next";
import Link from "next/link";
import { TotoSavedHistory } from "@/components/TotoSavedBet";
import { getArchive, type TotoRow } from "@/lib/results";

export const metadata: Metadata = {
  title: "My TOTO Research History | Lottery Intel",
  description: "Review saved TOTO research and grade it against the correct subsequent published draw.",
};

export default async function TotoHistoryPage() {
  const archive = await getArchive<TotoRow>("toto", {}, 100);
  const publishedDraws = (archive.data?.draws ?? []).map(({ draw, rows }) => ({
    drawNo: draw.draw_no,
    drawDate: draw.draw_date,
    main: rows.filter((r) => r.number_kind === "main").map((r) => r.winning_number).sort((a,b)=>a-b),
    additional: rows.find((r) => r.number_kind === "additional")?.winning_number ?? null,
  }));

  return <main className="container page-shell">
    <nav className="number-nav"><Link href="/">Home</Link><span>/</span><Link href="/toto">TOTO</Link><span>/ My History</span></nav>
    <span className="eyebrow">Personal research record</span>
    <h1>My TOTO history</h1>
    <p className="section-copy">Save research before each draw, confirm whether you actually placed it, and compare it with the correct next published TOTO result. Financial performance is only counted for entries you mark as placed.</p>
    <TotoSavedHistory publishedDraws={publishedDraws} />
    <aside className="rankings-warning"><strong>Privacy note:</strong> V1 records remain in this browser and may disappear if browser storage is cleared. Account syncing will replace this temporary storage for registered members.</aside>
  </main>;
}
