"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { searchArtists, type ArtistResult } from "@/lib/musicbrainz";

export type { ArtistResult };

export async function searchArtistsAction(query: string): Promise<ArtistResult[]> {
  if (query.trim().length < 2) return [];
  return searchArtists(query);
}

export async function followArtist(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const mbid = String(formData.get("mbid") || "");
  const name = String(formData.get("name") || "");
  if (!mbid || !name) return;

  await supabase
    .from("followed_artists")
    .upsert({ user_id: user.id, mbid, name }, { onConflict: "user_id,mbid", ignoreDuplicates: true });

  revalidatePath("/announcements");
}

export async function unfollowArtist(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("id") || "");
  if (!id) return;

  await supabase.from("followed_artists").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/announcements");
}
