import type { SupabaseClient } from "@supabase/supabase-js";
import { getArtistAlbums } from "@/lib/spotify";

/**
 * Spotify release dates can be year- or month-precision ("2024", "2024-05");
 * the release_date column needs a full date.
 */
export function normalizeReleaseDate(raw: string): string {
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  return raw;
}

export type ReleaseCheckResult = {
  artists: number;
  added: number;
  failures: string[];
};

/**
 * For every followed artist, fetch their latest albums/singles from Spotify
 * and cache any not already in `artist_releases`. Needs a service-role client
 * (artist_releases has no insert policy for normal users).
 *
 * Used by the scheduled endpoint (/api/cron/check-releases) and by
 * `npm run check-artist-releases`.
 */
export async function checkArtistReleases(
  supabase: SupabaseClient,
): Promise<ReleaseCheckResult> {
  const { data: follows, error } = await supabase
    .from("followed_artists")
    .select("spotify_artist_id, name");
  if (error) throw error;

  const artists = new Map<string, string>();
  for (const f of follows ?? []) artists.set(f.spotify_artist_id, f.name);

  const result: ReleaseCheckResult = { artists: artists.size, added: 0, failures: [] };

  // Artists are independent, so check them in parallel.
  await Promise.all(
    [...artists].map(async ([artistId, name]) => {
      let albums;
      try {
        albums = await getArtistAlbums(artistId);
      } catch (err) {
        result.failures.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
      if (!albums.length) return;

      // One lookup per artist instead of one per album.
      const { data: existing } = await supabase
        .from("artist_releases")
        .select("spotify_album_id")
        .in("spotify_album_id", albums.map((a) => a.id));
      const known = new Set((existing ?? []).map((r) => r.spotify_album_id as string));

      const fresh = albums
        .filter((album) => !known.has(album.id))
        .map((album) => ({
          spotify_artist_id: artistId,
          artist_name: name,
          spotify_album_id: album.id,
          title: album.name,
          album_type: album.album_type,
          release_date: normalizeReleaseDate(album.release_date),
          cover_url: album.images[0]?.url ?? null,
        }));
      if (!fresh.length) return;

      const { error: insertError } = await supabase
        .from("artist_releases")
        .upsert(fresh, { onConflict: "spotify_album_id", ignoreDuplicates: true });
      if (insertError) result.failures.push(`${name}: ${insertError.message}`);
      else result.added += fresh.length;
    }),
  );

  return result;
}
