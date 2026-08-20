import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div><strong>Lottery Intel</strong><p>Independent Singapore 4D, TOTO and Sweep results, historical statistics and AI-assisted research.</p></div>
        <div><strong>Explore</strong><nav aria-label="Footer navigation"><Link href="/4d">4D</Link><Link href="/toto">TOTO</Link><Link href="/singapore-sweep">Sweep</Link><Link href="/statistics">Statistics</Link><Link href="/live">Results Centre</Link></nav></div>
        <div><strong>Lottery Intel</strong><nav aria-label="Company navigation"><Link href="/about">About</Link><Link href="/how-it-works">How it works</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav><p>Historical results and research do not guarantee or predict future winning results. Lottery Intel is not affiliated with Singapore Pools.</p></div>
      </div>
    </footer>
  );
}
