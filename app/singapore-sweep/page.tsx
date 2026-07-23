import type { Metadata } from "next";

export const metadata: Metadata = { title: "Singapore Sweep Results" };

export default function SweepPage() {
  return <div className="container page-shell"><span className="eyebrow">Singapore Sweep</span><h1>Official Singapore Sweep results</h1><p className="notice">All official prize-winning numbers will be stored and published after validation.</p><div className="data-panel"><h2>Latest monthly draw</h2><p>Official result pending data connection.</p></div></div>;
}
