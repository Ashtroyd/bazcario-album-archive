import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { checkArtistReleases } from "@/lib/artist-releases";
import { createAdminClient } from "@/lib/supabase/admin";

// Always run fresh; Spotify calls for every followed artist can take a while.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Scheduled job: caches new releases for followed artists.
 * Called every 30 minutes by Supabase pg_cron (job "check-artist-releases",
 * see supabase/migrations/20261127100500_schedule_release_check.sql) with
 * `Authorization: Bearer $CRON_SECRET`.
 */
async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await checkArtistReleases(createAdminClient());
    if (result.failures.length) console.error("Release check failures:", result.failures);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Release check failed:", err);
    return NextResponse.json({ error: "Release check failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
