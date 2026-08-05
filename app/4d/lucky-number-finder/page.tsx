import type { Metadata } from "next";
import Link from "next/link";
import { FavouriteNumberButton } from "@/components/FavouriteNumberButton";
import { getLuckyNumberMatches } from "@/lib/lucky-number-finder-data";
import { parseLuckySearch, type LuckySort } from "@/lib/lucky-number-finder";
import { formatDrawDate } from "@/lib/results";

type Query = { digits?: string | string[]; mode?: string | string[]; sort?: string | string[] };
type Props = { searchParams: Promise<Query> };
const sortLabels: Record<LuckySort, string> = { score: "Historical Activity Score", appearances: "Most appearances", recent: "Most recent", absent: "Longest absent", number: "Number ascending" };
const prizeLabels = { first: "1st Prize", second: "2nd Prize", third: "3rd Prize", starter: "Starter", consolation: "Consolation" } as const;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const search = parseLuckySearch(await searchParams);
  const suffix = search.valid ? `?digits=${search.digits}&mode=${search.mode}&sort=${search.sort}` : "";
  return {
    title: search.valid ? `${search.digits} Lucky Number Finder results` : "Lucky Number Finder — Historical 4D Search",
    description: search.valid ? `Find exact four-digit historical results containing ${search.digits} in ${search.mode} order.` : "Search verified published 4D history for exact numbers containing one to four favourite digits.",
    alternates: { canonical: `/4d/lucky-number-finder${suffix}` }, robots: { index: true, follow: true },
  };
}

export const revalidate = 3600;

export default async function LuckyNumberFinderPage({ searchParams }: Props) {
  const search = parseLuckySearch(await searchParams);
  const result = search.valid ? await getLuckyNumberMatches(search.digits, search.mode, search.sort) : { data: [], error: null };
  return <main className="container page-shell lucky-page">
    <nav className="number-nav" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/4d">4D archive</Link><span>/ Lucky Finder</span></nav>
    <span className="eyebrow">Verified historical discovery</span>
    <h1>Lucky Number Finder</h1>
    <p className="section-copy">Enter one to four favourite digits. Ordered matching finds exact four-digit numbers containing those digits from left to right, with other digits allowed between them. Consecutive matching requires the digits to appear together. Leading zeroes are preserved.</p>
    <aside className="rankings-warning"><strong>Historical activity does not predict future results.</strong> This finder only searches past published 4D data. A higher score is not a recommendation to buy.</aside>

    <form className="lucky-form" action="/4d/lucky-number-finder" method="get">
      <label className="lucky-digits"><span>Favourite digits</span><input name="digits" inputMode="numeric" pattern="[0-9]{1,4}" minLength={1} maxLength={4} defaultValue={search.digits} placeholder="e.g. 18" aria-describedby="digits-help" required /><small id="digits-help">1–4 digits only; zeroes at the start are kept.</small></label>
      <fieldset><legend>Matching mode</legend><label><input type="radio" name="mode" value="ordered" defaultChecked={search.mode === "ordered"} /> Ordered</label><label><input type="radio" name="mode" value="consecutive" defaultChecked={search.mode === "consecutive"} /> Consecutive digits only</label></fieldset>
      <label><span>Sort results</span><select name="sort" defaultValue={search.sort}>{Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button type="submit">Find numbers</button>
    </form>

    {search.error && <div className="state state-error" role="alert"><strong>Check your search.</strong><small>{search.error}</small></div>}
    {result.error ? <div className="state state-error" role="alert"><strong>The database search could not be completed.</strong><small>{result.error} Please try again later.</small></div> : search.valid && result.data.length === 0 ? <div className="history-empty"><strong>No historical matches found</strong><p>No exact published 4D number contains these digits in the selected mode.</p></div> : search.valid && <>
      <div className="lucky-count" role="status"><strong>{result.data.length}</strong> {result.data.length === 1 ? "number" : "numbers"} found · sorted by {sortLabels[search.sort]}</div>
      <div className="ranking-table-wrap"><table className="ranking-table lucky-table"><thead><tr><th>Number</th><th>Activity score</th><th>Appearances</th><th>Last appearance</th><th>Days since</th><th>Average gap</th><th>Common prize</th><th>Last 12m / 24m</th><th>Actions</th></tr></thead><tbody>{result.data.map((item) => <tr key={item.winning_number}>
        <td data-label="Number"><Link className="ranked-number" href={`/4d/number/${item.winning_number}`}>{item.winning_number}</Link></td>
        <td data-label="Activity score"><strong>{item.historical_activity_score}/100</strong><small>{item.activity_label}</small></td>
        <td data-label="Appearances">{item.total_appearances.toLocaleString()}</td><td data-label="Last appearance">{formatDrawDate(item.last_appearance)}</td>
        <td data-label="Days since">{item.days_since_last_appearance.toLocaleString()}</td><td data-label="Average gap">{item.average_gap === null ? "—" : `${item.average_gap.toLocaleString()} days`}</td>
        <td data-label="Common prize">{prizeLabels[item.most_common_prize]}</td><td data-label="Last 12m / 24m">{item.appearances_last_12_months} / {item.appearances_last_24_months}</td>
        <td data-label="Actions"><Link className="history-link" href={`/4d/number/${item.winning_number}`}>Full history →</Link><FavouriteNumberButton number={item.winning_number} /></td>
      </tr>)}</tbody></table></div>
    </>}
    {!search.valid && !search.error && <section className="ranking-method"><h2>How matching works</h2><p>For “18”, ordered mode can find 0018, 1082 or 8181 because 1 occurs before a later 8. Consecutive mode only finds numbers containing the exact substring “18”. Results are unique exact numbers seen in the verified published archive and are limited to 100.</p></section>}
  </main>;
}
