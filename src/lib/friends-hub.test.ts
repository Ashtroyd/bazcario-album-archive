import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFriendsHub, type HubRating } from "./friends-hub";

const friends = [{ id: "a", name: "Alex", avatar: null }, { id: "b", name: "Bea", avatar: null }];
const rating = (user: string, album: string, score: number | string | null, date = "2026-10-01T00:00:00Z"): HubRating => ({ user_id: user, album_id: album, overall_rating: score, updated_at: date,
  album: { id: album, title: album, artist: "Artist", cover_image_url: null } });

test("discovers highly rated unscored albums without inventing circle consensus", () => {
  const data = buildFriendsHub(friends, [rating("me", "known", 9)], [rating("a", "new", 9), rating("b", "new", 8), rating("a", "known", 10), rating("b", "bad", 5)]);
  assert.equal(data.discoveries.length, 1);
  assert.equal(data.discoveries[0].album.id, "new");
  assert.equal(data.discoveries[0].average, 8.5);
  assert.equal(data.discoveries[0].listeners.length, 2);
  assert.equal(data.favourites.length, 2);
});
test("only accepted friends contribute; null, invalid and orphaned ratings are ignored", () => {
  const data = buildFriendsHub(friends, [], [rating("stranger", "secret", 10), rating("a", "unfinished", null), rating("a", "invalid", "NaN"), rating("a", "too-high", 12), { ...rating("b", "orphan", 9), album: null }]);
  assert.deepEqual(data.discoveries, []); assert.deepEqual(data.recent, []);
  assert.equal(data.insights.a.average, null);
});
test("score agreement requires three shared albums, and zero scores remain valid", () => {
  const my = [rating("me", "x", 0), rating("me", "y", 8), rating("me", "z", 10)];
  const theirs = [rating("a", "x", "0"), rating("a", "y", 8), rating("a", "z", 5), rating("b", "y", 8)];
  const data = buildFriendsHub(friends, my, theirs);
  assert.equal(data.insights.a.sharedAlbums, 3);
  assert.equal(data.insights.a.matchPct, 83);
  assert.equal(data.insights.b.matchPct, null);
  assert.equal(data.split?.album.id, "z"); assert.equal(data.split?.gap, 5);
});
test("duplicate rows cannot inflate listener counts and recent scores sort newest first", () => {
  const data = buildFriendsHub(friends, [], [rating("a", "x", 9), rating("a", "x", 8, "2026-10-05T00:00:00Z"), rating("b", "y", 10, "2026-10-03T00:00:00Z")]);
  assert.equal(data.recent.length, 2); assert.equal(data.recent[0].score, 8);
  assert.equal(data.favourites.find((pick) => pick.album.id === "x")?.listeners.length, 1);
});
test("empty/private data has no pretend percentage, recommendations or disagreement", () => {
  const data = buildFriendsHub(friends, [], []);
  assert.equal(data.insights.a.matchPct, null); assert.equal(data.split, null);
  assert.deepEqual(data.discoveries, []);
  assert.deepEqual(buildFriendsHub([], [], []).insights, {});
});
