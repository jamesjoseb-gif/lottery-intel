import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  return { title: `${number} 4D Number Intelligence` };
}

export default async function NumberPage({ params }: Props) {
  const { number } = await params;
  if (!/^\d{4}$/.test(number)) notFound();

  return <div className="container page-shell"><span className="eyebrow">4D number profile</span><h1>{number}</h1><p className="notice">Historical calculations will appear after the official result archive is imported. Lottery Intel describes past records only and does not predict future draws.</p><div className="metric-grid"><div className="metric"><span>Total appearances</span><strong>—</strong></div><div className="metric"><span>Top-three prizes</span><strong>—</strong></div><div className="metric"><span>Current gap</span><strong>—</strong></div><div className="metric"><span>Longest gap</span><strong>—</strong></div></div><div className="data-panel"><h2>Number timeline</h2><p>Timeline, monthly distribution, yearly frequency and prize-category history will be generated from validated draw records.</p></div></div>;
}
