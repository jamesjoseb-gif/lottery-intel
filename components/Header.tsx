import Link from "next/link";

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="Lottery Intel home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span><strong>Lottery</strong> <em>Intel</em></span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/4d">4D</Link>
          <Link href="/toto">TOTO</Link>
          <Link href="/singapore-sweep">Sweep</Link>
          <Link href="/statistics">Statistics</Link>
          <Link href="/live">Results Centre</Link>
        </nav>
      </div>
    </header>
  );
}
