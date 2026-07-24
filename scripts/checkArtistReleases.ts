/**
 * Scheduled job: for every artist anyone follows, fetch their albums/singles
 * from Spotify and cache any not already in artist_releases.
 * Run via GitHub Actions (.github/workflows/check-artist-releases.yml).
 *
 *   npm run check-artist-releases
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { createAdminClient } from "../src/lib/supabase/admin";
import { getArtistAlbums } from "../src/lib/spotify";

// Spotify release dates can be year- or month-precision ("2024", "2024-05");
// the release_date column needs a full date.
function normalizeReleaseDate(raw: string): string {
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  return raw;
}

async function main() {
  const supabase = createAdminClient();

  const { data: follows, error } = await supabase.from("followed_artists").select("spotify_artist_id, name");
  if (error) throw error;

  const artists = new Map<string, string>();
  for (const f of follows ?? []) artists.set(f.spotify_artist_id, f.name);

  for (const [artistId, name] of artists) {
    let albums;
    try {
      albums = await getArtistAlbums(artistId);
    } catch (err) {
      console.error(`Failed to fetch albums for ${name}:`, err);
      continue;
    }

    for (const album of albums) {
      const { data: existing } = await supabase
        .from("artist_releases")
        .select("id")
        .eq("spotify_album_id", album.id)
        .maybeSingle();
      if (existing) continue;

      const { error: insertError } = await supabase.from("artist_releases").insert({
        spotify_artist_id: artistId,
        artist_name: name,
        spotify_album_id: album.id,
        title: album.name,
        album_type: album.album_type,
        release_date: normalizeReleaseDate(album.release_date),
        cover_url: album.images[0]?.url ?? null,
      });

      if (insertError) {
        console.error(`Failed to save release "${album.name}" for ${name}:`, insertError.message);
      }
    }
  }

  console.log(`Artist release check complete (${artists.size} artist${artists.size === 1 ? "" : "s"}).`);
}

main().catch((err) => {
  console.error("Artist release check failed:", err);
  process.exit(1);
});
