import type { Metadata } from "next";
import Link from "next/link";
import { TotoSavedHistory } from "@/components/TotoSavedBet";

export const metadata: Metadata = {
  title: "My TOTO Research History | Lottery Intel",
  description: "Review TOTO bets and research scores saved in this browser.",
};

export default function TotoHistoryPage() {
  return <main className="container page-shell">
    <nav className="number-nav"><Link href="/">Home</Link><span>/</span><Link href="/toto">TOTO</Link><span>/ My History</span></nav>
    <span className="eyebrow">Personal research record</span>
    <h1>My TOTO history</h1>
    <p className="section-copy">Save the bets you research before each draw and compare how your choices and budget decisions change over time. V1 stores this history in this browser; account syncing and automatic post-draw grading are the next member features.</p>
    <TotoSavedHistory />
    <aside className="rankings-warning"><strong>Privacy note:</strong> Browser-saved records stay on this device and may disappear if browser storage is cleared. Account-based history will replace this temporary V1 storage for registered members.</aside>
  </main>;
}
