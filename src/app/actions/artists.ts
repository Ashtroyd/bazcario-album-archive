"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { searchArtists, type SpotifyArtistResult } from "@/lib/spotify";
import { lookupArtistMeta, type ArtistMeta } from "@/lib/musicbrainz";

export type ArtistSearchResult = SpotifyArtistResult & { meta: ArtistMeta | null };

export async function searchArtistsAction(query: string): Promise<ArtistSearchResult[]> {
  if (query.trim().length < 2) return [];

  const artists = await searchArtists(query, 5);
  const metas = await Promise.all(artists.map((a) => lookupArtistMeta(a.name)));
  return artists.map((a, i) => ({ ...a, meta: metas[i] }));
}

export async function followArtist(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const spotifyArtistId = String(formData.get("spotify_artist_id") || "");
  const name = String(formData.get("name") || "");
  if (!spotifyArtistId || !name) return;

  await supabase.from("followed_artists").upsert(
    { user_id: user.id, spotify_artist_id: spotifyArtistId, name },
    { onConflict: "user_id,spotify_artist_id", ignoreDuplicates: true },
  );

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
