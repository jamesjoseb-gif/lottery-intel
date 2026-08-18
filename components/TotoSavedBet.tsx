"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type SavedTotoBet = {
  id: string;
  savedAt: string;
  asOf: string;
  mode: string;
  numbers: number[];
  budget: number;
  researchScore: number;
  suggestedDeployment: number;
  uncommitted: number;
  evidence: string;
};

const STORAGE_KEY = "lottery-intel:toto-saved-bets:v1";

function readSaved(): SavedTotoBet[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedTotoBet[]; }
  catch { return []; }
}

export function SaveTotoBetButton({ bet }: { bet: Omit<SavedTotoBet, "id" | "savedAt"> }) {
  const [saved, setSaved] = useState(false);
  function save() {
    const current = readSaved();
    const item: SavedTotoBet = { ...bet, id: crypto.randomUUID(), savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...current].slice(0, 100)));
    setSaved(true);
  }
  return <div><button type="button" onClick={save} disabled={saved}>{saved ? "Saved to My TOTO History" : "Save this research"}</button> <Link href="/toto/history">View my history →</Link></div>;
}

export function TotoSavedHistory() {
  const [items, setItems] = useState<SavedTotoBet[]>([]);
  useEffect(() => setItems(readSaved()), []);
  function remove(id: string) {
    const next = items.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setItems(next);
  }
  if (!items.length) return <p className="state">No saved TOTO research yet. Analyse a bet and save it to start building your personal record.</p>;
  return <div className="recent-grid">{items.map((item) => <article className="recent-card" key={item.id}>
    <div><h3>{item.mode.toUpperCase()} · {item.researchScore}/100</h3><p>Saved {new Date(item.savedAt).toLocaleString("en-SG")}</p></div>
    <p><strong>{item.numbers.map((n) => String(n).padStart(2, "0")).join(" · ")}</strong></p>
    <p>Budget S${item.budget} · Suggested S${item.suggestedDeployment} · Keep S${item.uncommitted}</p>
    <p>{item.evidence} · data through {item.asOf}</p>
    <button type="button" onClick={() => remove(item.id)}>Remove</button>
  </article>)}</div>;
}
