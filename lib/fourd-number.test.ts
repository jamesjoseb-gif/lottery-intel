import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFourDNumber, sanitizeFourDInput } from "./fourd-number.ts";

test("normalizes one to four digits and preserves leading zeroes", () => {
  assert.equal(normalizeFourDNumber("7"), "0007");
  assert.equal(normalizeFourDNumber("042"), "0042");
  assert.equal(normalizeFourDNumber("0012"), "0012");
  assert.equal(normalizeFourDNumber("12-3"), "0123");
});

test("does not turn empty or invalid input into a number", () => {
  assert.equal(normalizeFourDNumber(""), null);
  assert.equal(normalizeFourDNumber("hello"), null);
  assert.equal(normalizeFourDNumber("12345"), null);
});

test("sanitizes typing to no more than four digits", () => {
  assert.equal(sanitizeFourDInput("a01-2345"), "0123");
});
