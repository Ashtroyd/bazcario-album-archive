import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import {
  albumRows,
  songRows,
  toCsv,
  trackRows,
  type ExportAlbum,
  type ExportSong,
  type ExportTrack,
} from "@/lib/export";

type RatingRow = {
  overall_rating: number | string | null;
  first_listen_date: string | null;
  notes: string | null;
  albums: {
    id: string;
    title: string;
    artist: string;
    release_year: number | null;
    genre: string | null;
  } | null;
};

type TrackRatingRow = {
  rating: number | string;
  replay_value: string | null;
  notes: string | null;
  tracks: { name: string; track_order: number; album_id: string } | null;
};

type SongRatingRow = {
  rating: number | string;
  replay_value: string | null;
  notes: string | null;
  songs: { title: string; artist: string; album_title: string | null } | null;
};

/**
 * GET /api/export?format=csv|xlsx — downloads the signed-in user's own ratings.
 * CSV is one row per rated track; Excel has Albums, Tracks and Songs sheets.
 */
export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [ratingsResult, tracksResult, songsResult] = await Promise.all([
    supabase
      .from("ratings")
      .select("overall_rating, first_listen_date, notes, albums(id, title, artist, release_year, genre)")
      .eq("user_id", user.id),
    supabase
      .from("track_ratings")
      .select("rating, replay_value, notes, tracks(name, track_order, album_id)")
      .eq("user_id", user.id),
    supabase
      .from("song_ratings")
      .select("rating, replay_value, notes, songs(title, artist, album_title)")
      .eq("user_id", user.id),
  ]);
  const failed = [ratingsResult, tracksResult, songsResult].find((r) => r.error);
  if (failed) {
    return NextResponse.json({ error: "Couldn't load your ratings" }, { status: 500 });
  }

  const albums: ExportAlbum[] = ((ratingsResult.data ?? []) as unknown as RatingRow[])
    .filter((r) => r.albums)
    .map((r) => ({
      albumId: r.albums!.id,
      title: r.albums!.title,
      artist: r.albums!.artist,
      releaseYear: r.albums!.release_year,
      genre: r.albums!.genre,
      overall: r.overall_rating == null ? null : Number(r.overall_rating),
      firstListenDate: r.first_listen_date,
      notes: r.notes,
    }));
  const tracks: ExportTrack[] = ((tracksResult.data ?? []) as unknown as TrackRatingRow[])
    .filter((t) => t.tracks)
    .map((t) => ({
      albumId: t.tracks!.album_id,
      trackOrder: t.tracks!.track_order,
      trackName: t.tracks!.name,
      rating: Number(t.rating),
      replayValue: t.replay_value,
      notes: t.notes,
    }));
  const songs: ExportSong[] = ((songsResult.data ?? []) as unknown as SongRatingRow[])
    .filter((s) => s.songs)
    .map((s) => ({
      title: s.songs!.title,
      artist: s.songs!.artist,
      albumTitle: s.songs!.album_title,
      rating: Number(s.rating),
      replayValue: s.replay_value,
      notes: s.notes,
    }));

  const stamp = new Date().toISOString().slice(0, 10);
  const headers = (type: string, ext: string) => ({
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="album-archive-${stamp}.${ext}"`,
    "Cache-Control": "no-store",
  });

  if (format === "csv") {
    return new Response(toCsv(trackRows(albums, tracks)), {
      headers: headers("text/csv; charset=utf-8", "csv"),
    });
  }

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(albumRows(albums)), "Albums");
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(trackRows(albums, tracks)), "Tracks");
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(songRows(songs)), "Songs");
  const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buffer), {
    headers: headers(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "xlsx",
    ),
  });
}
