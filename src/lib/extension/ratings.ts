import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { ReplayValue } from "@/lib/types";

type AdminClient = ReturnType<typeof createAdminClient>;

const REPLAY_VALUES = new Set<ReplayValue>([
  "Low",
  "Medium",
  "High",
  "Very High",
]);

export type ExtensionRatingInput = {
  rating: number | null;
  replayValue: ReplayValue | null;
  notes: string | null;
};

export function parseExtensionRatingInput(value: unknown): ExtensionRatingInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;

  let rating: number | null = null;
  if (input.rating !== null && input.rating !== undefined && input.rating !== "") {
    rating = Number(input.rating);
    if (!Number.isFinite(rating) || rating < 0 || rating > 10) return null;
    rating = Math.round(rating * 100) / 100;
  }

  const replayValue =
    input.replayValue == null || input.replayValue === ""
      ? null
      : REPLAY_VALUES.has(input.replayValue as ReplayValue)
        ? (input.replayValue as ReplayValue)
        : undefined;
  if (replayValue === undefined) return null;

  const notes = input.notes == null ? null : String(input.notes).trim() || null;
  if (notes && notes.length > 1000) return null;

  return { rating, replayValue, notes };
}

export async function getExtensionTrack(
  admin: AdminClient,
  userId: string,
  spotifyTrackId: string,
  siteOrigin: string,
) {
  const { data: mapping } = await admin
    .from("spotify_track_mappings")
    .select("track_id, spotify_album_id")
    .eq("spotify_track_id", spotifyTrackId)
    .maybeSingle();

  if (!mapping) {
    return { status: "track_missing" as const };
  }

  const [{ data: track }, { data: trackRating }] = await Promise.all([
    admin
      .from("tracks")
      .select("id, album_id, name, track_order, albums(id, title, artist, cover_image_url)")
      .eq("id", mapping.track_id)
      .maybeSingle(),
    admin
      .from("track_ratings")
      .select("rating, replay_value, notes")
      .eq("track_id", mapping.track_id)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (!track?.albums) return { status: "track_missing" as const };
  const album = track.albums as unknown as {
    id: string;
    title: string;
    artist: string;
    cover_image_url: string | null;
  };
  const { data: albumRating } = await admin
    .from("ratings")
    .select("overall_rating")
    .eq("album_id", album.id)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    status: "ready" as const,
    album: {
      id: album.id,
      title: album.title,
      artist: album.artist,
      coverUrl: album.cover_image_url,
      overallRating:
        albumRating?.overall_rating == null ? null : Number(albumRating.overall_rating),
      archiveUrl: `${siteOrigin}/album/${album.id}`,
      spotifyAlbumId: mapping.spotify_album_id as string,
    },
    track: {
      id: track.id as string,
      name: track.name as string,
      order: Number(track.track_order),
      rating: trackRating?.rating == null ? null : Number(trackRating.rating),
      replayValue: (trackRating?.replay_value as ReplayValue | null) ?? null,
      notes: (trackRating?.notes as string | null) ?? null,
    },
  };
}

export async function saveExtensionTrackRating(
  admin: AdminClient,
  userId: string,
  spotifyTrackId: string,
  input: ExtensionRatingInput,
) {
  const { data: mapping } = await admin
    .from("spotify_track_mappings")
    .select("track_id")
    .eq("spotify_track_id", spotifyTrackId)
    .maybeSingle();
  if (!mapping) return null;

  if (input.rating == null) {
    await admin
      .from("track_ratings")
      .delete()
      .eq("track_id", mapping.track_id)
      .eq("user_id", userId);
  } else {
    const { error } = await admin.from("track_ratings").upsert(
      {
        track_id: mapping.track_id,
        user_id: userId,
        rating: input.rating,
        replay_value: input.replayValue,
        notes: input.notes,
      },
      { onConflict: "track_id,user_id" },
    );
    if (error) throw error;
  }

  return mapping.track_id as string;
}
