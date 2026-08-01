/** Normalize user input without ever turning an empty value into `0000`. */
export function normalizeFourDNumber(value: string): string | null {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 0 || digits.length > 4) return null;

  return digits.padStart(4, "0");
}

/** Limit an input field to the four digits that can form a valid 4D number. */
export function sanitizeFourDInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}
