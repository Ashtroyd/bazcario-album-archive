/**
 * Scheduled job: for every artist anyone follows, fetch their release
 * groups from MusicBrainz and cache any not already in artist_releases.
 * Run via GitHub Actions (.github/workflows/check-artist-releases.yml).
 *
 *   npm run check-artist-releases
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { createAdminClient } from "../src/lib/supabase/admin";
import { getArtistReleaseGroups, getReleaseGroupCoverUrl } from "../src/lib/musicbrainz";

const RELEASE_TYPES = new Set(["Album", "EP", "Single"]);
const SKIP_SECONDARY_TYPES = new Set([
  "Compilation",
  "Live",
  "Remix",
  "Demo",
  "DJ-mix",
  "Mixtape/Street",
]);

async function main() {
  const supabase = createAdminClient();

  const { data: follows, error } = await supabase.from("followed_artists").select("mbid, name");
  if (error) throw error;

  const artists = new Map<string, string>();
  for (const f of follows ?? []) artists.set(f.mbid, f.name);

  for (const [mbid, name] of artists) {
    let groups;
    try {
      groups = await getArtistReleaseGroups(mbid);
    } catch (err) {
      console.error(`Failed to fetch release groups for ${name}:`, err);
      continue;
    }

    for (const g of groups) {
      if (!g.primaryType || !RELEASE_TYPES.has(g.primaryType)) continue;
      if (g.secondaryTypes.some((t) => SKIP_SECONDARY_TYPES.has(t))) continue;

      const { data: existing } = await supabase
        .from("artist_releases")
        .select("id")
        .eq("release_group_id", g.id)
        .maybeSingle();
      if (existing) continue;

      const coverUrl = await getReleaseGroupCoverUrl(g.id);

      const { error: insertError } = await supabase.from("artist_releases").insert({
        mbid,
        artist_name: name,
        release_group_id: g.id,
        title: g.title,
        release_type: g.primaryType,
        release_date: g.firstReleaseDate,
        cover_url: coverUrl,
      });

      if (insertError) {
        console.error(`Failed to save release "${g.title}" for ${name}:`, insertError.message);
      }
    }
  }

  console.log(`Artist release check complete (${artists.size} artist${artists.size === 1 ? "" : "s"}).`);
}

main().catch((err) => {
  console.error("Artist release check failed:", err);
  process.exit(1);
});
