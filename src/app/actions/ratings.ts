"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReplayValue } from "@/lib/types";

const REPLAY = new Set(["Low", "Medium", "High", "Very High"]);

export type RatingMetaSaveState = {
  status: "idle" | "success" | "error";
  message: string;
};

/**
 * Upsert (or clear) the current user's rating for a single track. Clearing the
 * rating (empty value) deletes the row. The DB trigger recomputes the album's
 * overall_rating automatically.
 */
export async function saveTrackRating(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in again to save ratings." };

  const track_id = String(formData.get("track_id") || "");
  const album_id = String(formData.get("album_id") || "");
  if (!track_id) return { ok: false as const, error: "This track could not be saved." };

  const ratingRaw = String(formData.get("rating") || "").trim();
  const replayRaw = String(formData.get("replay_value") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;
  const replay_value = REPLAY.has(replayRaw) ? (replayRaw as ReplayValue) : null;

  if (ratingRaw === "") {
    const { error } = await supabase
      .from("track_ratings")
      .delete()
      .eq("track_id", track_id)
      .eq("user_id", user.id);
    if (error) return { ok: false as const, error: "Your change was not saved." };
  } else {
    const parsedRating = Number(ratingRaw);
    if (!Number.isFinite(parsedRating)) {
      return { ok: false as const, error: "Use a score from 0 to 10." };
    }
    const rating = Math.max(0, Math.min(10, parsedRating));
    const { error } = await supabase.from("track_ratings").upsert(
      {
        track_id,
        user_id: user.id,
        rating: Math.round(rating * 100) / 100,
        replay_value,
        notes,
      },
      { onConflict: "track_id,user_id" },
    );
    if (error) return { ok: false as const, error: "Your change was not saved." };
  }
  if (album_id) revalidatePath(`/album/${album_id}`);
  return { ok: true as const };
}

/** Upsert album-level rating metadata (first listen, favorites, notes). */
export async function saveRatingMeta(
  _previousState: RatingMetaSaveState,
  formData: FormData,
): Promise<RatingMetaSaveState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sign in again to save album details." };
  }

  const album_id = String(formData.get("album_id") || "");
  if (!album_id) {
    return { status: "error", message: "This album could not be saved." };
  }

  const first_listen_date =
    String(formData.get("first_listen_date") || "").trim() || null;
  const favorite_track_id =
    String(formData.get("favorite_track_id") || "").trim() || null;
  const least_favorite_track_id =
    String(formData.get("least_favorite_track_id") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  const { error } = await supabase.from("ratings").upsert(
    {
      album_id,
      user_id: user.id,
      first_listen_date,
      favorite_track_id,
      least_favorite_track_id,
      notes,
    },
    { onConflict: "album_id,user_id" },
  );
  if (error) {
    return { status: "error", message: "Album details were not saved. Try again." };
  }

  revalidatePath(`/album/${album_id}`);
  return { status: "success", message: "Album details saved." };
}
