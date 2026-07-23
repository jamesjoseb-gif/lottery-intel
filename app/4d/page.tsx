import type { Metadata } from "next";
import { SearchBox } from "@/components/SearchBox";

export const metadata: Metadata = { title: "Singapore 4D Results" };

export default function FourDPage() {
  return <div className="container page-shell"><span className="eyebrow">Singapore 4D</span><h1>Official 4D results</h1><p className="notice">The official-results importer is being connected. The page will publish all 23 winning numbers: 1st, 2nd, 3rd, 10 Starter and 10 Consolation.</p><div className="data-panel"><h2>Check a number</h2><SearchBox /></div></div>;
}
