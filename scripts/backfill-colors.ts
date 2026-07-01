/**
 * One-off: compute and store the cover-art color palette for every album that
 * has a cover but no cached colors yet. Run after applying 0002_album_colors.sql.
 *
 *   npm run backfill:colors
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";
import { extractColors } from "../src/lib/palette";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars in .env.local");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient<any>(url, key, {
    auth: { persistSession: false },
  });

  const { data: albums, error } = await db
    .from("albums")
    .select("id, title, cover_image_url, cover_colors");
  if (error) throw error;

  let done = 0;
  for (const a of albums ?? []) {
    if (!a.cover_image_url || a.cover_colors) continue;
    const colors = await extractColors(a.cover_image_url);
    if (colors) {
      await db.from("albums").update({ cover_colors: colors }).eq("id", a.id);
      console.log(`  ✓ ${a.title} → ${JSON.stringify(colors)}`);
      done++;
    } else {
      console.log(`  - ${a.title}: could not extract colors`);
    }
  }
  console.log(`\nDone. Colored ${done} album(s).`);
}

main().catch((e) => {
  console.error("Backfill failed:", e);
  process.exit(1);
});
