"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function FourDQuickCheck() {
  const router = useRouter();
  const [number, setNumber] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = number.replace(/\D/g, "");
    if (!/^\d{4}$/.test(clean)) return;
    window.gtag?.("event", "check_4d_number", { number: clean, source: "4d_results" });
    router.push(`/4d/number/${clean}`);
  }
  return <section className="ranking-method" aria-labelledby="check-4d-number">
    <span className="eyebrow">Check your number</span>
    <h2 id="check-4d-number">Did your 4D number appear?</h2>
    <p>Enter any 4D number to check its historical appearances, then continue into Lottery Intel research for the next draw.</p>
    <form className="lucky-form" onSubmit={submit}>
      <label><span>My 4D number</span><input inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="e.g. 6149" value={number} onChange={e=>setNumber(e.target.value.replace(/\D/g, "").slice(0, 4))} /></label>
      <button type="submit">Check number history →</button>
    </form>
  </section>;
}

export function TotoQuickCheck() {
  const router = useRouter();
  const [numbers, setNumbers] = useState("");
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const tokens = numbers.split(/[\s,]+/).filter(Boolean);
    if (tokens.length < 2) {
      setError("Enter at least 2 TOTO numbers.");
      return;
    }
    if (tokens.length > 12) {
      setError("Enter no more than 12 TOTO numbers at a time.");
      return;
    }
    if (tokens.some(token => !/^\d{1,2}$/.test(token))) {
      setError("Use numbers only, separated by spaces or commas.");
      return;
    }
    const parsed = tokens.map(Number);
    if (parsed.some(n => n < 1 || n > 49)) {
      setError("TOTO numbers must be between 1 and 49.");
      return;
    }
    if (new Set(parsed).size !== parsed.length) {
      setError("Use unique TOTO numbers without duplicates.");
      return;
    }
    window.gtag?.("event", "check_toto_numbers", { count: parsed.length, source: "toto_results" });
    router.push(`/toto/analyse?mode=${parsed.length>=4?"match4":parsed.length===3?"match3":"match2"}&numbers=${encodeURIComponent(parsed.join(","))}`);
  }

  return <section className="ranking-method" aria-labelledby="check-toto-numbers">
    <span className="eyebrow">Check & research</span>
    <h2 id="check-toto-numbers">Enter the TOTO numbers you played</h2>
    <p>Paste two or more unique numbers from 1 to 49. Lottery Intel will carry them directly into Match 2, Match 3 or Match 4 historical relationship research.</p>
    <form className="lucky-form" onSubmit={submit}>
      <label><span>My TOTO numbers</span><input type="text" autoComplete="off" placeholder="e.g. 9, 16, 22, 24, 33, 47" value={numbers} onChange={e=>{setNumbers(e.target.value); if(error) setError("");}} aria-describedby={error?"toto-check-error":undefined} /></label>
      <button type="submit">Analyse my numbers →</button>
    </form>
    {error&&<p id="toto-check-error" className="state state-error" role="alert">{error}</p>}
  </section>;
}

declare global { interface Window { gtag?: (...args: unknown[]) => void } }
