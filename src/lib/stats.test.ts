import assert from "node:assert/strict";
import test from "node:test";
import {
  computeRatingStats,
  decadeLabel,
  median,
  scoreBuckets,
  type StatsAlbumRow,
} from "./stats";

const album = (over: Partial<StatsAlbumRow>): StatsAlbumRow => ({
  albumId: over.title ?? "a",
  title: "Album",
  artist: "Artist",
  genre: null,
  releaseYear: null,
  overall: null,
  ...over,
});

test("median handles odd, even and empty lists", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), null);
});

test("scoreBuckets puts 10 in the top bucket and low scores in < 5", () => {
  const buckets = scoreBuckets([10, 9, 8.99, 5, 4.9, 0]);
  assert.deepEqual(
    buckets.map((b) => [b.label, b.value]),
    [
      ["9–10", 2],
      ["8–9", 1],
      ["7–8", 0],
      ["6–7", 0],
      ["5–6", 1],
      ["< 5", 2],
    ],
  );
});

test("decadeLabel floors to the decade", () => {
  assert.equal(decadeLabel(1999), "1990s");
  assert.equal(decadeLabel(2020), "2020s");
  assert.equal(decadeLabel(null), null);
});

test("computeRatingStats groups and ranks scored albums only", () => {
  const stats = computeRatingStats(
    [
      album({ title: "A", artist: "X", genre: "Rock", releaseYear: 1994, overall: 8 }),
      album({ title: "B", artist: "X", genre: "Rock", releaseYear: 2001, overall: 6 }),
      album({ title: "C", artist: "Y", genre: "Jazz", releaseYear: 1998, overall: 9 }),
      album({ title: "D", artist: "Z", genre: "Jazz", overall: null }),
    ],
    [
      { rating: 7, replayValue: "High" },
      { rating: 9, replayValue: "High" },
      { rating: 5, replayValue: null },
    ],
  );

  assert.equal(stats.albumCount, 4);
  assert.equal(stats.scoredAlbumCount, 3);
  assert.equal(stats.albumAverage, 23 / 3);
  assert.equal(stats.trackMedian, 7);
  assert.deepEqual(stats.byGenre[0], { label: "Rock", count: 2, average: 7 });
  assert.deepEqual(stats.byDecade.map((d) => d.label), ["2000s", "1990s"]);
  assert.equal(stats.topArtists[0].label, "X");
  assert.deepEqual(stats.best.map((a) => a.title), ["C", "A", "B"]);
  assert.deepEqual(stats.worst, []);
  assert.equal(stats.replayValues.find((r) => r.label === "High")?.value, 2);
});
