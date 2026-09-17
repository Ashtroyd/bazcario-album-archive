import assert from "node:assert/strict";
import test from "node:test";
import { mapSongRatingRows } from "./songRatings";
import type { Song } from "./types";

const song: Song = {
  id: "song-1",
  spotify_track_id: "1234567890123456789012",
  spotify_album_id: null,
  title: "A song",
  artist: "An artist",
  album_title: "An album",
  cover_image_url: null,
  spotify_url: null,
  release_date: null,
  duration_ms: null,
  created_by: "user-1",
  created_at: "2026-09-17T00:00:00.000Z",
};

test("maps joined song rating rows and normalises numeric scores", () => {
  const ratings = mapSongRatingRows([
    {
      id: "rating-1",
      song_id: song.id,
      user_id: "user-1",
      rating: "9.25",
      replay_value: "Very High",
      notes: "Still on repeat",
      updated_at: "2026-09-17T12:00:00.000Z",
      song,
    },
  ]);

  assert.equal(ratings.length, 1);
  assert.equal(ratings[0].title, "A song");
  assert.equal(ratings[0].my_rating.rating, 9.25);
  assert.equal(ratings[0].my_rating.replay_value, "Very High");
});

test("drops orphaned rating rows with no joined song", () => {
  const ratings = mapSongRatingRows([
    {
      id: "rating-2",
      song_id: "missing-song",
      user_id: "user-1",
      rating: 8,
      replay_value: null,
      notes: null,
      updated_at: "2026-09-17T12:00:00.000Z",
      song: null,
    },
  ]);

  assert.deepEqual(ratings, []);
});
