"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBox() {
  const [value, setValue] = useState("");
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const number = value.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
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
        />
        <button type="submit">View intelligence</button>
      </div>
      <small id="search-help">Enter between 1 and 4 digits. Leading zeroes are supported.</small>
    </form>
  );
}
