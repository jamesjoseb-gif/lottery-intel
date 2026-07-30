"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const RECENT_SEARCHES_KEY = "lottery-intel-recent-searches";
const MAX_RECENT_SEARCHES = 5;

function normaliseNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
}

export function SearchBox() {
  const [value, setValue] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentSearches(
          parsed.filter((number): number is string => /^\d{4}$/.test(number)).slice(0, MAX_RECENT_SEARCHES),
        );
      }
    } catch {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    }
  }, []);

  function rememberSearch(number: string) {
    const updated = [number, ...recentSearches.filter((item) => item !== number)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updated);
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value) return;

    const number = normaliseNumber(value);
    rememberSearch(number);
    router.push(`/number/${number}`);
  }

  return (
    <form className="search-box" onSubmit={submit}>
      <label htmlFor="number-search">Search any 4D number</label>
      <div>
        <input
          id="number-search"
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          pattern="[0-9]{1,4}"
          placeholder="e.g. 1234"
          aria-describedby="search-help"
          autoComplete="off"
        />
        <button type="submit" disabled={!value}>
          View intelligence
        </button>
      </div>
      <small id="search-help">Enter between 1 and 4 digits. Leading zeroes are supported.</small>
      {recentSearches.length > 0 && (
        <div className="quick-searches" aria-label="Recent number searches">
          <span>Recent searches</span>
          {recentSearches.map((number) => (
            <Link key={number} href={`/number/${number}`} onClick={() => rememberSearch(number)}>
              {number}
            </Link>
          ))}
        </div>
      )}
    </form>
  );
}
