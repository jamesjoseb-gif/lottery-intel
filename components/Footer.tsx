import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div><strong>Lottery Intel</strong><p>An informational archive and statistics tool. Results data is attributed to Singapore Pools.</p></div>
        <div><strong>Explore</strong><nav aria-label="Footer navigation"><Link href="/4d">4D</Link><Link href="/toto">TOTO</Link><Link href="/singapore-sweep">Sweep</Link><Link href="/statistics">Statistics</Link><Link href="/live">Results Centre</Link></nav></div>
        <div><strong>Information</strong><nav aria-label="Legal navigation"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav><p>Historical results do not guarantee or predict winning results.</p></div>
      </div>
    </footer>
  );
}
