import assert from "node:assert/strict";
import test from "node:test";
import { disagreementGap, relevantComments } from "./notification-rules";

test("disagreementGap needs both scores and a big enough gap", () => {
  assert.equal(disagreementGap(8, 5.5), -2.5);
  assert.equal(disagreementGap(6, 8), 2);
  assert.equal(disagreementGap(7, 8.9), null);
  assert.equal(disagreementGap(null, 9), null);
  assert.equal(disagreementGap(7, undefined), null);
});

test("relevantComments maps track comments to albums and drops my own", () => {
  const kept = relevantComments(
    [
      { id: "1", user_id: "friend", target_type: "album", target_id: "A" },
      { id: "2", user_id: "friend", target_type: "track", target_id: "t1" },
      { id: "3", user_id: "me", target_type: "album", target_id: "A" },
      { id: "4", user_id: "friend", target_type: "album", target_id: "Z" },
      { id: "5", user_id: "friend", target_type: "track", target_id: "unknown" },
    ],
    new Map([["t1", "B"]]),
    new Set(["A", "B"]),
    "me",
  );
  assert.deepEqual(
    kept.map((c) => [c.id, c.albumId]),
    [
      ["1", "A"],
      ["2", "B"],
    ],
  );
});
