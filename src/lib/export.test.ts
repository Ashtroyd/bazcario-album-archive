import assert from "node:assert/strict";
import test from "node:test";
import { albumRows, toCsv, trackRows, type ExportAlbum } from "./export";

const albums: ExportAlbum[] = [
  {
    albumId: "b",
    title: "Second",
    artist: "Zed",
    releaseYear: 2001,
    genre: null,
    overall: 7.5,
    firstListenDate: null,
    notes: null,
  },
  {
    albumId: "a",
    title: "First",
    artist: "Abba",
    releaseYear: 1976,
    genre: "Pop",
    overall: 9,
    firstListenDate: "2026-01-02",
    notes: 'Said "wow", twice',
  },
];

test("albumRows sorts by artist then title", () => {
  assert.deepEqual(albumRows(albums).map((r) => r.Album), ["First", "Second"]);
});

test("trackRows orders by album then track number and drops orphans", () => {
  const rows = trackRows(albums, [
    { albumId: "a", trackOrder: 2, trackName: "Two", rating: 8, replayValue: null, notes: null },
    { albumId: "a", trackOrder: 1, trackName: "One", rating: 9, replayValue: "High", notes: null },
    { albumId: "missing", trackOrder: 1, trackName: "X", rating: 1, replayValue: null, notes: null },
  ]);
  assert.deepEqual(rows.map((r) => r.Track), ["One", "Two"]);
  assert.equal(rows[0]["Album score"], 9);
});

test("toCsv quotes commas, quotes and newlines and leaves blanks empty", () => {
  const csv = toCsv(albumRows(albums));
  const lines = csv.replace("﻿", "").trimEnd().split("\r\n");
  assert.equal(lines[0], "Artist,Album,Year,Genre,Overall score,First listen,Notes");
  assert.equal(lines[1], 'Abba,First,1976,Pop,9,2026-01-02,"Said ""wow"", twice"');
  assert.equal(lines[2], "Zed,Second,2001,,7.5,,");
});

test("toCsv on no rows is just the BOM", () => {
  assert.equal(toCsv([]), "﻿");
});
