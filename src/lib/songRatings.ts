import type { Song, SongRating, SongWithMyRating } from "@/lib/types";

type SongRatingRow = {
  id: string;
  song_id: string;
  user_id: string;
  rating: number | string;
  replay_value: SongRating["replay_value"];
  notes: string | null;
  updated_at: string;
  song: Song | null;
};

export function mapSongRatingRows(rows: SongRatingRow[]): SongWithMyRating[] {
  return rows.flatMap((row) => {
    if (!row.song) return [];

    const rating: SongRating = {
      id: row.id,
      song_id: row.song_id,
      user_id: row.user_id,
      rating: Number(row.rating),
      replay_value: row.replay_value,
      notes: row.notes,
      updated_at: row.updated_at,
    };

    return [{ ...row.song, my_rating: rating }];
  });
}

export async function getMySongRatings(
  // The server client is intentionally generic in this project; RLS still runs
  // as the signed-in user and the explicit user filter keeps intent clear.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  limit?: number,
): Promise<SongWithMyRating[]> {
  let query = supabase
    .from("song_ratings")
    .select("*, song:songs(*)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (limit != null) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("Could not load song ratings", error);
    return [];
  }

  return mapSongRatingRows((data ?? []) as unknown as SongRatingRow[]);
}
