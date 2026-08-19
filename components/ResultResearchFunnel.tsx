"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function FourDQuickCheck() {
  const router = useRouter();
  const [number, setNumber] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = number.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
    if (clean.length !== 4) return;
    window.gtag?.("event", "check_4d_number", { number: clean, source: "4d_results" });
    router.push(`/4d/number/${clean}`);
  }
  return <section className="ranking-method" aria-labelledby="check-4d-number">
    <span className="eyebrow">Check your number</span>
    <h2 id="check-4d-number">Did your 4D number appear?</h2>
    <p>Enter any 4D number to check its historical appearances, then continue into Lottery Intel research for the next draw.</p>
    <form className="lucky-form" onSubmit={submit}>
      <label><span>My 4D number</span><input inputMode="numeric" pattern="[0-9]{1,4}" maxLength={4} placeholder="e.g. 6149" value={number} onChange={e=>setNumber(e.target.value)} /></label>
      <button type="submit">Check number history →</button>
    </form>
  </section>;
}

export function TotoQuickCheck() {
  const router = useRouter();
  const [numbers, setNumbers] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = [...new Set(numbers.split(/[\s,]+/).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=49))].slice(0,12);
    if (parsed.length < 2) return;
    window.gtag?.("event", "check_toto_numbers", { count: parsed.length, source: "toto_results" });
    router.push(`/toto/analyse?mode=${parsed.length>=4?"match4":parsed.length===3?"match3":"match2"}&numbers=${encodeURIComponent(parsed.join(","))}`);
  }
  return <section className="ranking-method" aria-labelledby="check-toto-numbers">
    <span className="eyebrow">Check & research</span>
    <h2 id="check-toto-numbers">Enter the TOTO numbers you played</h2>
    <p>Paste two or more numbers. Lottery Intel will carry them directly into Match 2, Match 3 or Match 4 historical relationship research.</p>
    <form className="lucky-form" onSubmit={submit}>
      <label><span>My TOTO numbers</span><input inputMode="numeric" placeholder="e.g. 9, 16, 22, 24, 33, 47" value={numbers} onChange={e=>setNumbers(e.target.value)} /></label>
      <button type="submit">Analyse my numbers →</button>
    </form>
  </section>;
}

declare global { interface Window { gtag?: (...args: unknown[]) => void } }
