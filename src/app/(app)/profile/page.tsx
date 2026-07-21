import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth";
import { signout } from "@/app/actions/auth";
import { FavoriteTrackPicker } from "@/components/FavoriteTrackPicker";
import { ProfileSettingsCard } from "@/components/ProfileSettingsCard";
import { MonthlyFavoritesMonthSection } from "@/components/MonthlyFavoritesMonthSection";
import { cn, formatScore } from "@/lib/utils";

export default async function ProfilePage() {
  const supabase = await createClient();
  const profile = await getMyProfile();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ratingsData } = await supabase
    .from("ratings")
    .select("overall_rating, albums(id, title, genre)")
    .eq("user_id", user!.id);
  const rated = (ratingsData ?? []) as unknown as {
    overall_rating: number | null;
    albums: { id: string; title: string; genre: string | null } | null;
  }[];
  const ratedAlbums = rated.filter((r) => r.albums);

  const { data: trData } = await supabase
    .from("track_ratings")
    .select("rating, tracks(id, name, albums(title))")
    .eq("user_id", user!.id);
  const trackRatings = (trData ?? []) as unknown as {
    rating: number | string;
    tracks: {
      id: string;
      name: string;
      albums: { title: string } | null;
    } | null;
  }[];

  // ---- Aggregate stats ----
  const overalls = ratedAlbums
    .map((r) => r.overall_rating)
    .filter((n): n is number => n != null)
    .map(Number);
  const avgOverall = overalls.length
    ? overalls.reduce((a, b) => a + b, 0) / overalls.length
    : null;

  let topAlbum: { title: string; score: number } | null = null;
  for (const r of ratedAlbums) {
    const s = r.overall_rating != null ? Number(r.overall_rating) : null;
    if (s != null && (!topAlbum || s > topAlbum.score))
      topAlbum = { title: r.albums!.title, score: s };
  }

  const genreCount: Record<string, number> = {};
  for (const r of ratedAlbums) {
    const g = r.albums!.genre;
    if (g) genreCount[g] = (genreCount[g] || 0) + 1;
  }
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  const trackScores = trackRatings
    .map((t) => Number(t.rating))
    .filter((n) => Number.isFinite(n));
  const avgTrack = trackScores.length
    ? trackScores.reduce((a, b) => a + b, 0) / trackScores.length
    : null;

  const ranges = [
    { label: "9–10", min: 9, max: 10.001 },
    { label: "8–9", min: 8, max: 9 },
    { label: "7–8", min: 7, max: 8 },
    { label: "6–7", min: 6, max: 7 },
    { label: "< 6", min: -1, max: 6 },
  ];
  const distribution = ranges.map((b) => ({
    label: b.label,
    value: trackScores.filter((s) => s >= b.min && s < b.max).length,
  }));

  const personality =
    avgTrack == null
      ? null
      : avgTrack >= 8.5
        ? "Generous"
        : avgTrack >= 7
          ? "Balanced"
          : "Critical";

  const { count: friendCount } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
    .eq("status", "accepted");

  const stats = [
    { label: "Albums rated", value: String(ratedAlbums.length) },
    { label: "Tracks rated", value: String(trackScores.length) },
    { label: "Avg rating", value: formatScore(avgOverall) },
    { label: "Friends", value: String(friendCount ?? 0) },
  ];

  // Manual favourite-track pick.
  const { data: favRow } = await supabase
    .from("profiles")
    .select("favorite_track_id")
    .eq("id", user!.id)
    .maybeSingle();
  const favTrackId =
    (favRow?.favorite_track_id as string | null | undefined) ?? null;
  const trackList = Array.from(
    new Map(
      trackRatings
        .filter((t) => t.tracks?.id)
        .map((t) => [
          t.tracks!.id,
          {
            id: t.tracks!.id,
            name: t.tracks!.name,
            album: t.tracks!.albums?.title ?? null,
          },
        ]),
    ).values(),
  );
  const favTrack = trackList.find((t) => t.id === favTrackId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-ink">Profile</h1>
        <div className="flex items-center gap-2">
          <Link href="/favourites" className="btn btn-outline text-sm">
            Favourite songs
          </Link>
          <form action={signout}>
            <button type="submit" className="btn btn-outline text-sm">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <ProfileSettingsCard
          avatarUrl={profile?.avatar_url ?? null}
          displayName={profile?.display_name ?? null}
          email={user?.email ?? null}
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 self-start">
          {stats.map((s) => (
            <div key={s.label} className="card">
              <div className="text-xs tracking-wide text-muted uppercase">
                {s.label}
              </div>
              <div className="mt-1 text-2xl font-bold text-ink">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <MonthlyFavoritesMonthSection userId={user!.id} />

      {ratedAlbums.length > 0 && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-ink">
                Your rating distribution
              </h2>
              {trackScores.length > 0 ? (
                <Bars data={distribution} colorClass="bg-accent" />
              ) : (
                <p className="text-sm text-muted">
                  Rate some tracks to see this.
                </p>
              )}
            </div>
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-ink">Top genres</h2>
              {topGenres.length > 0 ? (
                <Bars data={topGenres} colorClass="bg-sage" />
              ) : (
                <p className="text-sm text-muted">No genres yet.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Highlight
              label="Highest-rated album"
              value={topAlbum?.title ?? "—"}
              sub={topAlbum ? formatScore(topAlbum.score) : undefined}
            />
            <div className="card">
              <div className="text-[10px] tracking-wide text-muted uppercase">
                Favourite track
              </div>
              <FavoriteTrackPicker tracks={trackList} current={favTrackId} />
              {favTrack?.album && (
                <div className="mt-1 truncate text-xs text-muted">
                  {favTrack.album}
                </div>
              )}
            </div>
            <Highlight
              label="Rating style"
              value={personality ?? "—"}
              sub={avgTrack != null ? `avg track ${formatScore(avgTrack)}` : undefined}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Bars({
  data,
  colorClass = "bg-accent",
}: {
  data: { label: string; value: number }[];
  colorClass?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="w-14 shrink-0 truncate text-right text-muted">
            {d.label}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-ivory">
            <div
              className={cn("h-full rounded", colorClass)}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-muted">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function Highlight({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card">
      <div className="text-[10px] tracking-wide text-muted uppercase">
        {label}
      </div>
      <div className="mt-1 truncate font-semibold text-ink" title={value}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
