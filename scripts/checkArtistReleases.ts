/**
 * Manual / backup run of the artist release check. The regular schedule is
 * Supabase pg_cron calling /api/cron/check-releases every 30 minutes.
 *
 *   npm run check-artist-releases
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { checkArtistReleases } from "../src/lib/artist-releases";
import { createAdminClient } from "../src/lib/supabase/admin";

checkArtistReleases(createAdminClient())
  .then(({ artists, added, failures }) => {
    for (const failure of failures) console.error(failure);
    console.log(
      `Artist release check complete (${artists} artist${artists === 1 ? "" : "s"}, ${added} new).`,
    );
  })
  .catch((err) => {
    console.error("Artist release check failed:", err);
    process.exit(1);
  });
