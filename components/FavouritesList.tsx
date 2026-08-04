"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient, getOrCreateUser } from "@/lib/supabase/client";

type FavouriteSummary = {
  number: string; score: number; activityLabel: string; totalWins: number;
  lastAppearance: string | null; daysSinceLastAppearance: number | null; mostCommonPrize: string | null;
};

export function FavouritesList() {
  const [items, setItems] = useState<FavouriteSummary[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const client = createClient();
        const user = await getOrCreateUser();
        const favourites = await client.from("user_favourite_numbers").select("number").eq("user_id", user.id).order("created_at", { ascending: false });
        if (favourites.error) throw favourites.error;
        const numbers = (favourites.data ?? []).map(({ number }) => number);
        if (!numbers.length) { if (active) setState("ready"); return; }
        const response = await fetch(`/api/favourites?numbers=${encodeURIComponent(numbers.join(","))}`);
        const payload = await response.json() as { favourites?: FavouriteSummary[]; error?: string };
        if (!response.ok || !payload.favourites) throw new Error(payload.error ?? "Could not load favourite details.");
        if (active) { setItems(payload.favourites); setState("ready"); }
      } catch (cause) {
        if (active) { setError(cause instanceof Error ? cause.message : "Could not load favourites."); setState("error"); }
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function remove(number: string) {
    setMessage("");
    try {
      const user = await getOrCreateUser();
      const result = await createClient().from("user_favourite_numbers").delete().eq("user_id", user.id).eq("number", number);
      if (result.error) throw result.error;
      setItems((current) => current.filter((item) => item.number !== number));
      setConfirming(null);
      setMessage(`${number} removed from favourites.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove this favourite.");
      setState("error");
    }
  }

  if (state === "loading") return <div className="loading-panel favourites-loading" aria-live="polite"><p>Loading your favourites…</p><span /><span /></div>;
  if (state === "error") return <div className="state state-error" role="alert"><strong>Favourites could not be loaded.</strong><small>{error}</small><button type="button" onClick={() => location.reload()}>Try again</button></div>;
  if (!items.length) return <div><div className="history-empty"><strong>No favourite numbers yet</strong><p>Open a 4D Number History page and choose “Add to favourites”.</p><Link href="/4d">Browse the 4D archive</Link></div>{message && <p className="favourite-message" role="status">{message}</p>}</div>;

  return <>
    {message && <p className="favourite-message" role="status">{message}</p>}
    <div className="favourites-grid">{items.map((item) => <article className="favourite-card" key={item.number}>
      <div className="favourite-card-heading"><div><span>Winning number</span><h2>{item.number}</h2></div><div className="favourite-score"><strong>{item.score}</strong><span>/ 100</span><small>{item.activityLabel}</small></div></div>
      <dl>
        <div><dt>Total wins</dt><dd>{item.totalWins}</dd></div>
        <div><dt>Last appearance</dt><dd>{item.lastAppearance ?? "—"}</dd></div>
        <div><dt>Days since last appearance</dt><dd>{item.daysSinceLastAppearance?.toLocaleString() ?? "—"}</dd></div>
        <div><dt>Most common prize</dt><dd>{item.mostCommonPrize ?? "—"}</dd></div>
      </dl>
      <div className="favourite-actions"><Link href={`/4d/number/${item.number}`}>Full Number History</Link><button type="button" onClick={() => setConfirming(item.number)}>Remove</button></div>
      {confirming === item.number && <div className="remove-confirmation" role="group" aria-label={`Confirm removal of ${item.number}`}><p>Remove {item.number} from your favourites?</p><button type="button" onClick={() => void remove(item.number)}>Yes, remove</button><button type="button" onClick={() => setConfirming(null)}>Cancel</button></div>}
    </article>)}</div>
  </>;
}
