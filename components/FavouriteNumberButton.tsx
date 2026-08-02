"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function FavouriteNumberButton({ number }: { number: string }) {
  const [state, setState] = useState<"loading" | "signed-out" | "saved" | "unsaved" | "error">("loading");

  useEffect(() => {
    let active = true;
    const client = createClient();
    client.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      if (!data.user) return setState("signed-out");
      const { data: saved, error } = await client.from("user_favourite_numbers").select("number").eq("user_id", data.user.id).eq("number", number).maybeSingle();
      if (active) setState(error ? "error" : saved ? "saved" : "unsaved");
    });
    return () => { active = false; };
  }, [number]);

  async function toggle() {
    const client = createClient();
    const { data } = await client.auth.getUser();
    if (!data.user) return setState("signed-out");
    setState("loading");
    const result = state === "saved"
      ? await client.from("user_favourite_numbers").delete().eq("user_id", data.user.id).eq("number", number)
      : await client.from("user_favourite_numbers").upsert({ user_id: data.user.id, number }, { onConflict: "user_id,number" });
    setState(result.error ? "error" : state === "saved" ? "unsaved" : "saved");
  }

  if (state === "signed-out") return <span className="favourite-note">Sign in to save this number to your favourites.</span>;
  return <button className="favourite-button" type="button" onClick={toggle} disabled={state === "loading"} aria-pressed={state === "saved"}>
    {state === "saved" ? "★ Saved to favourites" : state === "error" ? "Try favourite again" : state === "loading" ? "Checking favourite…" : "☆ Save as favourite"}
  </button>;
}
