import type { Metadata } from "next";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatMonthLabel, monthParamToKey } from "@/lib/monthlyFavorites";

/**
 * Small lookups used only by `generateMetadata`. Wrapped in React `cache` so a
 * page that also needs the same row in the same request doesn't pay twice.
 */
export const getAlbumHeading = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("albums")
    .select("title, artist")
    .eq("id", id)
    .maybeSingle();
  return data as { title: string; artist: string } | null;
});

export const getProfileName = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();
  return (data as { display_name: string | null } | null)?.display_name ?? null;
});

export function albumTitle(
  album: { title: string; artist: string } | null,
): string {
  return album ? `${album.title} – ${album.artist}` : "Album";
}

export function monthTitle(monthParamValue: string): string | null {
  const key = monthParamToKey(monthParamValue);
  return key ? formatMonthLabel(key) : null;
}

export function titled(title: string): Metadata {
  return { title };
}
