"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeFourDNumber, sanitizeFourDInput } from "@/lib/fourd-number";

export function SearchBox() {
  const [value, setValue] = useState("");
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const number = normalizeFourDNumber(value);
    if (!number) return;
    router.push(`/4d/number/${number}`);
  }

  return (
    <form className="search-box" onSubmit={submit}>
      <label htmlFor="number-search">Search any 4D number</label>
      <div>
        <input
          id="number-search"
          value={value}
          onChange={(event) => setValue(sanitizeFourDInput(event.target.value))}
          inputMode="numeric"
          pattern="[0-9]{1,4}"
          placeholder="e.g. 1234"
          aria-describedby="search-help"
        />
        <button type="submit" disabled={!normalizeFourDNumber(value)}>View intelligence</button>
      </div>
      <small id="search-help">Enter between 1 and 4 digits. Leading zeroes are supported.</small>
    </form>
  );
}
