import type { SupabaseClient } from "@supabase/supabase-js";
import type { HubRating } from "./friends-hub";

/** Paginate rather than silently calculating taste from the API's first 1000 rows. */
export async function loadHubRatings(supabase: SupabaseClient, userIds: string[]): Promise<HubRating[]> {
  if (!userIds.length) return [];
  const rows: HubRating[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("ratings")
      .select("user_id,album_id,overall_rating,updated_at,album:albums(id,title,artist,cover_image_url)")
      .in("user_id", userIds).not("overall_rating", "is", null)
      .order("id").range(offset, offset + 999).abortSignal(AbortSignal.timeout(8000));
    if (error) throw error;
    rows.push(...(data as unknown as HubRating[]));
    if (data.length < 1000) return rows;
  }
}
