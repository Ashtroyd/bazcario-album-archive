import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { getSpotifyTrack } from "@/lib/spotify";
import type { ReplayValue } from "@/lib/types";
import type { ExtensionRatingInput } from "@/lib/extension/ratings";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function getExtensionSongRating(
  admin: AdminClient,
  userId: string,
  spotifyTrackId: string,
) {
  const { data: song } = await admin
    .from("songs")
    .select("id, spotify_track_id, title, artist, album_title, cover_image_url, spotify_url")
    .eq("spotify_track_id", spotifyTrackId)
    .maybeSingle();
  if (!song) return { status: "song_missing" as const };

  const { data: rating } = await admin
    .from("song_ratings")
    .select("rating, replay_value, notes")
    .eq("song_id", song.id)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    status: "ready" as const,
    song: {
      id: song.id as string,
      spotifyTrackId: song.spotify_track_id as string,
      title: song.title as string,
      artist: song.artist as string,
      albumTitle: (song.album_title as string | null) ?? null,
      coverUrl: (song.cover_image_url as string | null) ?? null,
      spotifyUrl: (song.spotify_url as string | null) ?? null,
      rating: rating?.rating == null ? null : Number(rating.rating),
      replayValue: (rating?.replay_value as ReplayValue | null) ?? null,
      notes: (rating?.notes as string | null) ?? null,
    },
  };
}

export async function saveExtensionSongRating(
  admin: AdminClient,
  userId: string,
  spotifyTrackId: string,
  input: ExtensionRatingInput,
) {
  const existing = await getExtensionSongRating(admin, userId, spotifyTrackId);
  if (input.rating == null) {
    if (existing.status === "song_missing") return existing;
    const { error } = await admin
      .from("song_ratings")
      .delete()
      .eq("song_id", existing.song.id)
      .eq("user_id", userId);
    if (error) throw error;
    return getExtensionSongRating(admin, userId, spotifyTrackId);
  }

  let songId = existing.status === "ready" ? existing.song.id : null;
  if (!songId) {
    const track = await getSpotifyTrack(spotifyTrackId);
    const { data: created, error } = await admin
      .from("songs")
      .upsert(
        {
          spotify_track_id: track.id,
          spotify_album_id: track.albumId,
          title: track.title,
          artist: track.artist,
          album_title: track.albumTitle,
          cover_image_url: track.coverUrl,
          spotify_url: track.spotifyUrl,
          release_date: track.releaseDate,
          duration_ms: track.durationMs,
          created_by: userId,
        },
        { onConflict: "spotify_track_id", ignoreDuplicates: true },
      )
      .select("id")
      .maybeSingle();
    if (error) throw error;
    songId = created?.id ? String(created.id) : null;
    if (!songId) {
      const { data: matched, error: matchError } = await admin
        .from("songs")
        .select("id")
        .eq("spotify_track_id", spotifyTrackId)
        .single();
      if (matchError || !matched) throw matchError ?? new Error("Song catalog lookup failed");
      songId = matched.id as string;
    }
  }

  const { error } = await admin.from("song_ratings").upsert(
    {
      song_id: songId,
      user_id: userId,
      rating: input.rating,
      replay_value: input.replayValue,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "song_id,user_id" },
  );
  if (error) throw error;

  return getExtensionSongRating(admin, userId, spotifyTrackId);
}
