import assert from "node:assert/strict";
import test from "node:test";
import {
  isEditableMonthKey,
  monthKey,
  monthParamToKey,
} from "./monthlyFavorites";

const september = new Date(2026, 8, 16);

test("monthParamToKey accepts real calendar months only", () => {
  assert.equal(monthParamToKey("2026-08"), "2026-08-01");
  assert.equal(monthParamToKey("2026-00"), null);
  assert.equal(monthParamToKey("2026-13"), null);
  assert.equal(monthParamToKey("2026-8"), null);
});

test("isEditableMonthKey accepts canonical current and past months", () => {
  assert.equal(isEditableMonthKey("2026-09-01", september), true);
  assert.equal(isEditableMonthKey("2026-08-01", september), true);
  assert.equal(isEditableMonthKey("2026-10-01", september), false);
  assert.equal(isEditableMonthKey("2026-08-02", september), false);
});

test("monthKey uses the supplied date's calendar month", () => {
  assert.equal(monthKey(september), "2026-09-01");
});
