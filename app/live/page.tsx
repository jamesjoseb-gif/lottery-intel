import type { Metadata } from "next";

export const metadata: Metadata = { title: "Live Draw Centre" };

export default function LivePage() {
  return <div className="container page-shell"><span className="eyebrow">Draw-night dashboard</span><h1>Live Draw Centre</h1><p className="notice">Lottery Intel will show only officially published results. It will never present unverified numbers as official.</p><div className="data-panel"><h2>Publication status</h2><div className="metric-grid"><div className="metric"><span>4D</span><strong>Waiting</strong></div><div className="metric"><span>TOTO</span><strong>Waiting</strong></div><div className="metric"><span>Sweep</span><strong>Monthly</strong></div><div className="metric"><span>Auto refresh</span><strong>Planned</strong></div></div></div></div>;
}
