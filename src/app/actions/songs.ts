"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSpotifyTrack } from "@/lib/spotify";
import type { ReplayValue } from "@/lib/types";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const REPLAY_VALUES = new Set<ReplayValue>(["Low", "Medium", "High", "Very High"]);

export type SaveSongRatingInput = {
  spotifyTrackId: string;
  rating: number;
  replayValue: ReplayValue | null;
  notes: string | null;
};

export type RestoreSongRatingInput = {
  songId: string;
  rating: number;
  replayValue: ReplayValue | null;
  notes: string | null;
};

export async function saveSongRating(
  input: SaveSongRatingInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to save this song." };

  const rating = Number(input.rating);
  const notes = input.notes?.trim() || null;
  if (!SPOTIFY_ID.test(input.spotifyTrackId)) {
    return { ok: false, error: "This Spotify song is invalid." };
  }
  if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
    return { ok: false, error: "Use a score from 0 to 10." };
  }
  if (input.replayValue !== null && !REPLAY_VALUES.has(input.replayValue)) {
    return { ok: false, error: "Choose a valid replay value." };
  }
  if (notes && notes.length > 1000) {
    return { ok: false, error: "Keep the listening note under 1,000 characters." };
  }

  try {
    const track = await getSpotifyTrack(input.spotifyTrackId);
    const admin = createAdminClient();
    const { data: song, error: songError } = await admin
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
          created_by: user.id,
        },
        { onConflict: "spotify_track_id", ignoreDuplicates: true },
      )
      .select("id")
      .maybeSingle();

    let songId = song?.id as string | undefined;
    if (!songId && !songError) {
      const { data: existing } = await admin
        .from("songs")
        .select("id")
        .eq("spotify_track_id", track.id)
        .single();
      songId = existing?.id as string | undefined;
    }
    if (songError || !songId) throw songError ?? new Error("Song catalog insert failed");

    const { error: ratingError } = await supabase.from("song_ratings").upsert(
      {
        song_id: songId,
        user_id: user.id,
        rating: Math.round(rating * 100) / 100,
        replay_value: input.replayValue,
        notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "song_id,user_id" },
    );
    if (ratingError) throw ratingError;

    revalidatePath("/songs");
    return { ok: true };
  } catch (error) {
    console.error("Standalone song rating save failed", error);
    return { ok: false, error: "Could not save this song rating." };
  }
}

export async function deleteSongRating(
  songId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to remove this rating." };

  const { data, error } = await supabase
    .from("song_ratings")
    .delete()
    .eq("song_id", songId)
    .eq("user_id", user.id)
    .select("song_id")
    .maybeSingle();
  if (error) return { ok: false, error: "Could not remove this rating." };
  if (!data) return { ok: false, error: "This rating was already removed." };

  revalidatePath("/songs");
  return { ok: true };
}

/** Restore a just-deleted rating without needing another Spotify lookup. */
export async function restoreSongRating(
  input: RestoreSongRatingInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to restore this rating." };

  const rating = Number(input.rating);
  const notes = input.notes?.trim() || null;
  if (!input.songId) return { ok: false, error: "This song could not be restored." };
  if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
    return { ok: false, error: "The previous score could not be restored." };
  }
  if (input.replayValue !== null && !REPLAY_VALUES.has(input.replayValue)) {
    return { ok: false, error: "The previous replay value could not be restored." };
  }
  if (notes && notes.length > 1000) {
    return { ok: false, error: "The previous note could not be restored." };
  }

  const { error } = await supabase.from("song_ratings").upsert(
    {
      song_id: input.songId,
      user_id: user.id,
      rating: Math.round(rating * 100) / 100,
      replay_value: input.replayValue,
      notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "song_id,user_id" },
  );
  if (error) return { ok: false, error: "Could not restore this rating." };

  revalidatePath("/songs");
  return { ok: true };
}
