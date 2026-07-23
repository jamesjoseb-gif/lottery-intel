import type { Metadata } from "next";

export const metadata: Metadata = { title: "Singapore TOTO Results" };

export default function TotoPage() {
  return <div className="container page-shell"><span className="eyebrow">Singapore TOTO</span><h1>Official TOTO results</h1><p className="notice">This page will display the six winning numbers, additional number, official draw information and the next advertised Group 1 prize amount.</p><div className="data-panel"><h2>Next draw prize</h2><p>Official amount pending data connection.</p></div></div>;
}
