import assert from "node:assert/strict";
import test from "node:test";
import { normalizeReleaseDate } from "./artist-releases";

test("normalizeReleaseDate pads year and month precision dates", () => {
  assert.equal(normalizeReleaseDate("2024"), "2024-01-01");
  assert.equal(normalizeReleaseDate("2024-05"), "2024-05-01");
  assert.equal(normalizeReleaseDate("2024-05-17"), "2024-05-17");
});
