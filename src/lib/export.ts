/**
 * Builds the rows for "Export my ratings". Pure so the column layout and CSV
 * escaping can be unit tested without Supabase.
 */

export type ExportAlbum = {
  albumId: string;
  title: string;
  artist: string;
  releaseYear: number | null;
  genre: string | null;
  overall: number | null;
  firstListenDate: string | null;
  notes: string | null;
};

export type ExportTrack = {
  albumId: string;
  trackOrder: number;
  trackName: string;
  rating: number;
  replayValue: string | null;
  notes: string | null;
};

export type ExportSong = {
  title: string;
  artist: string;
  albumTitle: string | null;
  rating: number;
  replayValue: string | null;
  notes: string | null;
};

export type Row = Record<string, string | number | null>;

export function albumRows(albums: ExportAlbum[]): Row[] {
  return [...albums]
    .sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title))
    .map((a) => ({
      Artist: a.artist,
      Album: a.title,
      Year: a.releaseYear,
      Genre: a.genre,
      "Overall score": a.overall,
      "First listen": a.firstListenDate,
      Notes: a.notes,
    }));
}

/** One row per rated track, carrying its album's details alongside. */
export function trackRows(albums: ExportAlbum[], tracks: ExportTrack[]): Row[] {
  const byId = new Map(albums.map((a) => [a.albumId, a]));
  return tracks
    .filter((t) => byId.has(t.albumId))
    .sort((a, b) => {
      const A = byId.get(a.albumId)!;
      const B = byId.get(b.albumId)!;
      return (
        A.artist.localeCompare(B.artist) ||
        A.title.localeCompare(B.title) ||
        a.trackOrder - b.trackOrder
      );
    })
    .map((t) => {
      const a = byId.get(t.albumId)!;
      return {
        Artist: a.artist,
        Album: a.title,
        Year: a.releaseYear,
        Genre: a.genre,
        "Album score": a.overall,
        "#": t.trackOrder,
        Track: t.trackName,
        Rating: t.rating,
        "Replay value": t.replayValue,
        "Track notes": t.notes,
      };
    });
}

export function songRows(songs: ExportSong[]): Row[] {
  return [...songs]
    .sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title))
    .map((s) => ({
      Artist: s.artist,
      Song: s.title,
      Album: s.albumTitle,
      Rating: s.rating,
      "Replay value": s.replayValue,
      Notes: s.notes,
    }));
}

function csvCell(value: string | number | null): string {
  if (value == null) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV with a BOM so Excel opens accented names correctly. */
export function toCsv(rows: Row[]): string {
  if (!rows.length) return "﻿";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((h) => csvCell(row[h] ?? null)).join(",")),
  ];
  return "﻿" + lines.join("\r\n") + "\r\n";
}
