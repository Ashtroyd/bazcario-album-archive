import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRatingInput } from "./ratingInput";

test("keeps valid scores and rounds them to two decimals", () => {
  assert.equal(normalizeRatingInput("9.25"), "9.25");
  assert.equal(normalizeRatingInput("8.999"), "9");
});

test("clamps manually entered scores to the zero-to-ten range", () => {
  assert.equal(normalizeRatingInput("99"), "10");
  assert.equal(normalizeRatingInput("-4"), "0");
});

test("preserves clearing and rejects non-numeric scores", () => {
  assert.equal(normalizeRatingInput("  "), "");
  assert.equal(normalizeRatingInput("not a score"), null);
});
