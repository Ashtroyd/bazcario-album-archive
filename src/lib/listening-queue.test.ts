import test from "node:test";
import assert from "node:assert/strict";
import { isQueueStatus, listeningStage } from "./listening-queue";

test("only unscored listening states can be persisted", () => {
  assert.equal(isQueueStatus("want"), true);
  assert.equal(isQueueStatus("listening"), true);
  for (const value of ["rated", "", null, undefined, 0]) assert.equal(isQueueStatus(value), false);
});

test("a real score including zero takes precedence over queue state", () => {
  for (const score of [0, "0", 8.5, "9.1", 10]) {
    assert.equal(listeningStage("want", score), "rated");
    assert.equal(listeningStage("listening", score), "rated");
    assert.equal(listeningStage(null, score), "rated");
  }
});

test("missing or invalid scores do not manufacture a Rated status", () => {
  for (const score of [null, undefined, "", "not a score", NaN, Infinity, -1, 11]) {
    assert.equal(listeningStage("want", score), "want");
    assert.equal(listeningStage("listening", score), "listening");
    assert.equal(listeningStage(null, score), null);
  }
});
