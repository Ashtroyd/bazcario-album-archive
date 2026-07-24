import { createClient } from "@/lib/supabase/server";
import { ArtistFollowSearch } from "@/components/ArtistFollowSearch";
import { FollowedArtistsList } from "@/components/FollowedArtistsList";
import { CoverImage } from "@/components/CoverImage";
import { formatDate, isWithinDays } from "@/lib/utils";
import type { ArtistRelease } from "@/lib/types";

const NEW_WINDOW_DAYS = 14;

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: follows } = await supabase
    .from("followed_artists")
    .select("id, spotify_artist_id, name")
    .eq("user_id", user!.id)
    .order("name");

  const artists = follows ?? [];
  const spotifyIds = artists.map((a) => a.spotify_artist_id);

  let releases: ArtistRelease[] = [];
  if (spotifyIds.length > 0) {
    const { data } = await supabase
      .from("artist_releases")
      .select("*")
      .in("spotify_artist_id", spotifyIds)
      .order("release_date", { ascending: false, nullsFirst: false })
      .limit(50);
    releases = (data ?? []) as ArtistRelease[];
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-ink">Announcements</h1>
        <p className="text-sm text-muted">
          Follow artists to see their new releases here. Checked every 30 minutes.
        </p>
      </div>

      <ArtistFollowSearch followedIds={spotifyIds} />

      <FollowedArtistsList artists={artists} />

      <section className="space-y-2">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
          Releases
        </h2>

        {artists.length === 0 ? (
          <p className="text-sm text-muted">Follow an artist above to start seeing releases.</p>
        ) : releases.length === 0 ? (
          <p className="text-sm text-muted">
            No releases recorded yet for your followed artists — check back after the next scan.
          </p>
        ) : (
          <ul className="space-y-2">
            {releases.map((r) => {
              const isNew = isWithinDays(r.release_date, NEW_WINDOW_DAYS);
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(38,37,33,0.06)]"
                >
                  <CoverImage
                    url={r.cover_url}
                    alt={r.title}
                    className="h-14 w-14 shrink-0 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{r.artist_name}</span> — {r.title}
                    </p>
                    <p className="text-[11px] text-muted">
                      {formatDate(r.release_date)}
                      {r.album_type && ` · ${r.album_type}`}
                    </p>
                  </div>
                  {isNew && <span className="chip shrink-0 border-accent/40 text-accent">New</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
