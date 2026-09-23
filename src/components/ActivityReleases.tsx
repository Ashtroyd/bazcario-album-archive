import { ArtistFollowSearch } from "@/components/ArtistFollowSearch";
import { CoverImage } from "@/components/CoverImage";
import { FollowedArtistsList } from "@/components/FollowedArtistsList";
import { createClient } from "@/lib/supabase/server";
import type { ArtistRelease } from "@/lib/types";
import { formatDate, isWithinDays } from "@/lib/utils";

const NEW_WINDOW_DAYS = 14;

export async function ActivityReleases({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: follows } = await supabase
    .from("followed_artists")
    .select("id, spotify_artist_id, name")
    .eq("user_id", userId)
    .order("name");

  const artists = follows ?? [];
  const spotifyIds = artists.map((artist) => artist.spotify_artist_id);
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
    <div className="space-y-6">
      <ArtistFollowSearch followedIds={spotifyIds} />
      <FollowedArtistsList artists={artists} />
      <section className="space-y-2">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Releases</h2>
        {artists.length === 0 ? (
          <p className="card text-sm text-muted">Follow an artist above to start seeing their releases.</p>
        ) : releases.length === 0 ? (
          <p className="card text-sm text-muted">No releases recorded yet. Check back after the next scan.</p>
        ) : (
          <ul className="space-y-2">
            {releases.map((release) => (
              <li key={release.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(38,37,33,0.06)]">
                <CoverImage url={release.cover_url} alt={release.title} className="h-14 w-14 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm"><span className="font-medium">{release.artist_name}</span> — {release.title}</p>
                  <p className="text-[11px] text-muted">
                    {formatDate(release.release_date)}{release.album_type ? ` · ${release.album_type}` : null}
                  </p>
                </div>
                {isWithinDays(release.release_date, NEW_WINDOW_DAYS) ? (
                  <span className="chip shrink-0 border-accent/40 text-accent">New</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
