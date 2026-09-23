import Link from "next/link";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Avatar } from "@/components/Avatar";
import {
  ContinueRatingHero,
  type ContinueAlbum,
} from "@/components/ContinueRatingHero";
import {
  DashboardRecentRatings,
  type DashboardRecentItem,
} from "@/components/DashboardRecentRatings";
import { MonthlyFavoritesCard } from "@/components/MonthlyFavoritesCard";
import { getFriendActivity } from "@/lib/activity";
import { getMyProfile } from "@/lib/auth";
import {
  formatMonthLabel,
  getFriendsMonthlyFavorites,
  getMonthlyFavorites,
  monthKey,
  monthParam,
} from "@/lib/monthlyFavorites";
import { getMySongRatings } from "@/lib/songRatings";
import { createClient } from "@/lib/supabase/server";
import type { Album } from "@/lib/types";

type DashboardTrack = { id: string; name: string; track_order: number };
type RatingWithAlbum = {
  overall_rating: number | null;
  updated_at: string;
  album: (Album & { tracks: DashboardTrack[] }) | null;
};
type TrackRatingWithAlbum = {
  track_id: string;
  track: { album_id: string } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;
  const currentMonth = monthKey();

  const [
    profile,
    mineResult,
    trackRatingsResult,
    friendshipsResult,
    mySongs,
    myPicks,
  ] = await Promise.all([
    getMyProfile(),
    supabase
      .from("ratings")
      .select("overall_rating, updated_at, album:albums(*, tracks(id, name, track_order))")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("track_ratings")
      .select("track_id, track:tracks!inner(album_id)")
      .eq("user_id", userId),
    supabase
      .from("friendships")
      .select("user_id, friend_id")
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq("status", "accepted"),
    getMySongRatings(supabase, userId, 4),
    getMonthlyFavorites(supabase, userId, currentMonth),
  ]);

  const myAlbums = ((mineResult.data ?? []) as unknown as RatingWithAlbum[]).filter(
    (rating): rating is RatingWithAlbum & { album: Album & { tracks: DashboardTrack[] } } =>
      rating.album !== null,
  );
  const ratedTrackIdsByAlbum = new Map<string, Set<string>>();
  for (const rating of (trackRatingsResult.data ?? []) as unknown as TrackRatingWithAlbum[]) {
    if (!rating.track) continue;
    const ids = ratedTrackIdsByAlbum.get(rating.track.album_id) ?? new Set<string>();
    ids.add(rating.track_id);
    ratedTrackIdsByAlbum.set(rating.track.album_id, ids);
  }

  const inProgress = myAlbums.find((rating) => {
    const total = rating.album.tracks.length;
    const rated = ratedTrackIdsByAlbum.get(rating.album.id)?.size ?? 0;
    return total > 0 && rated < total;
  });
  const continueItem: ContinueAlbum | null = inProgress
    ? buildContinueItem(inProgress, ratedTrackIdsByAlbum)
    : null;

  const recentItems: DashboardRecentItem[] = [
    ...myAlbums.map((rating) => ({
      id: rating.album.id,
      kind: "Album" as const,
      href: `/album/${rating.album.id}`,
      title: rating.album.title,
      artist: rating.album.artist,
      coverUrl: rating.album.cover_image_url,
      score: rating.overall_rating == null ? null : Number(rating.overall_rating),
      updatedAt: rating.updated_at,
    })),
    ...mySongs.map((song) => ({
      id: song.id,
      kind: "Song" as const,
      href: "/songs",
      title: song.title,
      artist: song.artist,
      coverUrl: song.cover_image_url,
      score: Number(song.my_rating.rating),
      updatedAt: song.my_rating.updated_at,
    })),
  ]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  const friendIds = (friendshipsResult.data ?? []).map((friendship) =>
    friendship.user_id === userId ? friendship.friend_id : friendship.user_id,
  ) as string[];
  const [activity, friendsPicks] = await Promise.all([
    getFriendActivity(supabase, userId, friendIds),
    getFriendsMonthlyFavorites(supabase, friendIds, currentMonth),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-accent">Your archive</p>
        <h1 className="mt-0.5 text-balance font-serif text-2xl font-bold text-ink sm:text-3xl">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}.
        </h1>
      </header>

      <ContinueRatingHero item={continueItem} />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-ink">Recently rated</h2>
            <p className="text-sm text-muted">Albums and songs, together in listening order.</p>
          </div>
          <Link href="/albums" className="shrink-0 text-sm text-accent hover:underline">
            Open Library →
          </Link>
        </div>

        {recentItems.length > 0 ? (
          <DashboardRecentRatings items={recentItems} />
        ) : (
          <div className="card text-sm text-muted">
            Nothing rated yet. <Link href="/album/new" className="text-accent hover:underline">Add your first album →</Link>
          </div>
        )}
      </section>

      <div className="grid gap-8 border-t border-line pt-7 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-4" data-tour="monthly-favourites">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink">
                {formatMonthLabel(currentMonth)} favourites
              </h2>
              <p className="text-sm text-muted">The songs defining your month.</p>
            </div>
            <Link href="/favourites" className="shrink-0 text-sm text-accent hover:underline">
              {myPicks.length > 0 ? "Edit →" : "Add songs →"}
            </Link>
          </div>

          {myPicks.length > 0 ? (
            <div className="card overflow-hidden">
              <MonthlyFavoritesCard picks={myPicks} />
            </div>
          ) : (
            <div className="card text-sm text-muted">
              Pick the songs you keep returning to this month.
            </div>
          )}

          {friendsPicks.length > 0 ? (
            <div>
              <p className="label">Friends this month</p>
              <div className="flex flex-wrap gap-2">
                {friendsPicks.map((friend) => (
                  <Link
                    key={friend.userId}
                    href={`/friends/${friend.userId}/favourites/${monthParam(currentMonth)}`}
                    className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-2.5 pl-1 transition-colors hover:border-line-strong hover:bg-ivory"
                  >
                    <Avatar url={friend.avatar} name={friend.name} size={24} />
                    <span className="text-xs font-medium text-body">
                      {friend.name ?? "A friend"} · {friend.picks.length} {friend.picks.length === 1 ? "pick" : "picks"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <ActivityFeed
          items={activity}
          initialLimit={3}
          title="From friends"
          showClear={false}
          viewAllHref="/activity"
        />
      </div>
    </div>
  );
}

function buildContinueItem(
  rating: RatingWithAlbum & { album: Album & { tracks: DashboardTrack[] } },
  ratedTrackIdsByAlbum: Map<string, Set<string>>,
): ContinueAlbum {
  const ratedIds = ratedTrackIdsByAlbum.get(rating.album.id) ?? new Set<string>();
  const tracks = rating.album.tracks.toSorted((a, b) => a.track_order - b.track_order);
  const next = tracks.find((track) => !ratedIds.has(track.id)) ?? null;

  return {
    album: rating.album,
    score: rating.overall_rating == null ? null : Number(rating.overall_rating),
    ratedTracks: ratedIds.size,
    totalTracks: tracks.length,
    nextTrack: next ? { id: next.id, name: next.name, order: next.track_order } : null,
  };
}
