import type { Metadata } from "next";
import Link from "next/link";
import { FavouriteNumberButton } from "@/components/FavouriteNumberButton";
import { getLuckyNumberMatches } from "@/lib/lucky-number-finder-data";
import { parseLuckySearch, type LuckySort } from "@/lib/lucky-number-finder";
import { formatDrawDate } from "@/lib/results";

type Query = { digits?: string | string[]; mode?: string | string[]; sort?: string | string[] };
type Props = { searchParams: Promise<Query> };
const sortLabels: Record<LuckySort, string> = { score: "Highest Stats Score", appearances: "Most appearances", recent: "Hot / most recent", absent: "Overdue / longest absent", number: "Number ascending" };
const prizeLabels = { first: "1st Prize", second: "2nd Prize", third: "3rd Prize", starter: "Starter", consolation: "Consolation" } as const;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const search = parseLuckySearch(await searchParams);
  const suffix = search.valid ? `?digits=${search.digits}&mode=${search.mode}&sort=${search.sort}` : "";
  return {
    title: search.valid ? `${search.digits} Stats Finder results` : "4D Stats Finder — Find Strong Historical Profiles",
    description: search.valid ? `Rank four-digit historical results containing ${search.digits} using verified archive statistics.` : "Use verified Singapore 4D history to discover and rank numbers by statistical profile, recent activity and absence.",
    alternates: { canonical: `/4d/lucky-number-finder${suffix}` }, robots: { index: true, follow: true },
  };
}

export const revalidate = 3600;

export default async function LuckyNumberFinderPage({ searchParams }: Props) {
  const search = parseLuckySearch(await searchParams);
  const result = search.valid ? await getLuckyNumberMatches(search.digits, search.mode, search.sort) : { data: [], error: null };
  return <main className="container page-shell lucky-page">
    <nav className="number-nav" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/4d">4D archive</Link><span>/ Stats Finder</span></nav>
    <span className="eyebrow">Data-guided number discovery</span>
    <h1>4D Stats Finder</h1>
    <p className="section-copy">Start with digits that matter to you, then let Lottery Intel rank matching 4D numbers using verified historical statistics. Use Highest Stats Score for the strongest overall historical profile, Hot for recent activity, or Overdue for numbers absent the longest.</p>
    <aside className="rankings-warning"><strong>Statistics are not a prediction or guarantee.</strong> Every valid 4D number can be drawn. Scores help compare historical profiles so you can make a more informed shortlist.</aside>

    <section className="ranking-method" aria-labelledby="finder-start"><h2 id="finder-start">How do you want to search?</h2><p><strong>Highest Stats Score</strong> — strongest overall historical activity. <strong>Hot</strong> — favour recently active matches. <strong>Overdue</strong> — surface matches absent for longer. Enter your favourite digits below and choose the strategy in “Sort results”.</p></section>

    <form className="lucky-form" action="/4d/lucky-number-finder" method="get">
      <label className="lucky-digits"><span>Your favourite digits</span><input name="digits" inputMode="numeric" pattern="[0-9]{1,4}" minLength={1} maxLength={4} defaultValue={search.digits} placeholder="e.g. 6741" aria-describedby="digits-help" required /><small id="digits-help">Use 1–4 digits from a favourite number, birthday, car number or any number you want to investigate.</small></label>
      <fieldset><legend>How should the digits match?</legend><label><input type="radio" name="mode" value="ordered" defaultChecked={search.mode === "ordered"} /> Keep my digits in order</label><label><input type="radio" name="mode" value="consecutive" defaultChecked={search.mode === "consecutive"} /> Keep my digits together</label></fieldset>
      <label><span>Strategy</span><select name="sort" defaultValue={search.sort}>{Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button type="submit">Find my strongest matches</button>
    </form>

    {search.error && <div className="state state-error" role="alert"><strong>Check your search.</strong><small>{search.error}</small></div>}
    {result.error ? <div className="state state-error" role="alert"><strong>The database search could not be completed.</strong><small>{result.error} Please try again later.</small></div> : search.valid && result.data.length === 0 ? <div className="history-empty"><strong>No historical matches found</strong><p>No exact published 4D number contains these digits in the selected mode.</p></div> : search.valid && <>
      <div className="lucky-count" role="status"><strong>{result.data.length}</strong> {result.data.length === 1 ? "number" : "numbers"} found · ranked by {sortLabels[search.sort]}</div>
      <section className="ranking-method"><h2>Your statistics-based shortlist</h2><p>Open any number to see why it received its score, including full winning history, recent activity, average gaps and digit-position analysis. The score describes past data; it does not change the mathematical odds of the next draw.</p></section>
      <div className="ranking-table-wrap"><table className="ranking-table lucky-table"><thead><tr><th>Number</th><th>Stats score</th><th>Appearances</th><th>Last appearance</th><th>Days since</th><th>Average gap</th><th>Common prize</th><th>Last 12m / 24m</th><th>Actions</th></tr></thead><tbody>{result.data.map((item) => <tr key={item.winning_number}>
        <td data-label="Number"><Link className="ranked-number" href={`/4d/number/${item.winning_number}`}>{item.winning_number}</Link></td>
        <td data-label="Stats score"><strong>{item.historical_activity_score}/100</strong><small>{item.activity_label}</small></td>
        <td data-label="Appearances">{item.total_appearances.toLocaleString()}</td><td data-label="Last appearance">{formatDrawDate(item.last_appearance)}</td>
        <td data-label="Days since">{item.days_since_last_appearance.toLocaleString()}</td><td data-label="Average gap">{item.average_gap === null ? "—" : `${item.average_gap.toLocaleString()} days`}</td>
        <td data-label="Common prize">{prizeLabels[item.most_common_prize]}</td><td data-label="Last 12m / 24m">{item.appearances_last_12_months} / {item.appearances_last_24_months}</td>
        <td data-label="Actions"><Link className="history-link" href={`/4d/number/${item.winning_number}`}>Why this number? →</Link><FavouriteNumberButton number={item.winning_number} /></td>
      </tr>)}</tbody></table></div>
      <section className="ranking-method"><h2>Want a stronger comparison?</h2><p>Use the score to shortlist candidates, then open “Why this number?” to compare the deeper evidence. Membership will later unlock broader ranked shortlists, saved strategies, personalised picks and draw-by-draw performance tracking.</p></section>
    </>}
    {!search.valid && !search.error && <section className="ranking-method"><h2>Try it like a customer</h2><p>Enter a number such as 6741, choose <strong>Highest Stats Score</strong>, and search. If you enter fewer than four digits, the finder discovers other historical numbers containing those digits. Ordered mode allows gaps; together mode requires the exact digit sequence.</p></section>}
  </main>;
}
