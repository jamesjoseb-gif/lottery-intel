export default function RankingsLoading() {
  return <main className="container page-shell rankings-page" aria-busy="true"><span className="eyebrow">Verified archive analysis</span><h1>Loading 4D rankings…</h1><div className="loading-panel">{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div></main>;
}
