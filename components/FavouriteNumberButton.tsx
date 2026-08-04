"use client";

import { useEffect, useState } from "react";
import { createClient, getOrCreateUser } from "@/lib/supabase/client";

type State = "loading" | "saved" | "unsaved" | "error";

export function FavouriteNumberButton({ number }: { number: string }) {
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const client = createClient();
    getOrCreateUser().then(async (user) => {
      const { data: saved, error } = await client.from("user_favourite_numbers").select("number").eq("user_id", user.id).eq("number", number).maybeSingle();
      if (!active) return;
      if (error) { setMessage(`Could not check favourites: ${error.message}`); setState("error"); }
      else setState(saved ? "saved" : "unsaved");
    }).catch((error: unknown) => {
      if (active) { setMessage(error instanceof Error ? error.message : "Could not start a favourites session."); setState("error"); }
    });
    return () => { active = false; };
  }, [number]);

  async function toggle() {
    if (!/^\d{4}$/.test(number) || state === "loading") return;
    const wasSaved = state === "saved";
    setState("loading");
    setMessage("");
    try {
      const client = createClient();
      const user = await getOrCreateUser();
      const result = wasSaved
        ? await client.from("user_favourite_numbers").delete().eq("user_id", user.id).eq("number", number)
        : await client.from("user_favourite_numbers").upsert({ user_id: user.id, number }, { onConflict: "user_id,number", ignoreDuplicates: true });
      if (result.error) throw result.error;
      setState(wasSaved ? "unsaved" : "saved");
      setMessage(wasSaved ? `${number} removed from favourites.` : `${number} added to favourites.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not update this favourite.");
    }
  }

  return <div className="favourite-control">
    <button className="favourite-button" type="button" onClick={toggle} disabled={state === "loading"} aria-pressed={state === "saved"}>
      {state === "saved" ? "★ Remove from favourites" : state === "error" ? "Try favourite again" : state === "loading" ? "Checking favourite…" : "☆ Add to favourites"}
    </button>
    {message && <span className={state === "error" ? "favourite-message favourite-message-error" : "favourite-message"} role={state === "error" ? "alert" : "status"}>{message}</span>}
  </div>;
}
