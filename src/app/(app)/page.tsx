import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Avatar } from "@/components/Avatar";
import { DashboardAlbumRatings } from "@/components/DashboardAlbumRatings";
import { DashboardSongRatings } from "@/components/DashboardSongRatings";
import { MonthlyFavoritesCard } from "@/components/MonthlyFavoritesCard";
import { getFriendActivity } from "@/lib/activity";
import { getMySongRatings } from "@/lib/songRatings";
import {
  formatMonthLabel,
  getFriendsMonthlyFavorites,
  getMonthlyFavorites,
  monthKey,
  monthParam,
} from "@/lib/monthlyFavorites";
import type { Album } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentMonth = monthKey();
  const [profile, mineResult, friendshipsResult, mySongs, myPicks] =
    await Promise.all([
      getMyProfile(),
      supabase
        .from("ratings")
        .select("overall_rating, updated_at, album:albums(*)")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(4),
      supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
        .eq("status", "accepted"),
      getMySongRatings(supabase, user!.id, 2),
      getMonthlyFavorites(supabase, user!.id, currentMonth),
    ]);
  const mineData = mineResult.data;
  const mine = (mineData ?? []) as unknown as {
    overall_rating: number | null;
    album: Album | null;
  }[];
  const myAlbums = mine.filter((r) => r.album);

  const fr = friendshipsResult.data;
  const friendIds = (fr ?? []).map((f) =>
    f.user_id === user!.id ? f.friend_id : f.user_id,
  ) as string[];

  const [activity, friendsPicks] = await Promise.all([
    getFriendActivity(supabase, user!.id, friendIds),
    getFriendsMonthlyFavorites(supabase, friendIds, currentMonth),
  ]);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-serif text-2xl font-bold text-ink">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        <p className="text-muted">
          Your album and song ratings, synced everywhere.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-ink">
            Recent album ratings
          </h2>
          <Link href="/albums" className="text-sm text-accent hover:underline">
            View all →
          </Link>
        </div>
        {myAlbums.length === 0 ? (
          <div className="card text-sm text-muted">
            You haven&apos;t rated anything yet.{" "}
            <Link href="/album/new" className="text-accent hover:underline">
              Add an album →
            </Link>
          </div>
        ) : (
          <DashboardAlbumRatings
            ratings={myAlbums.map((rating) => ({
              album: rating.album!,
              score:
                rating.overall_rating == null
                  ? null
                  : Number(rating.overall_rating),
            }))}
          />
        )}
      </section>

      <div className="grid gap-8 border-t border-line pt-6 lg:grid-cols-[1.05fr_0.95fr_1fr] lg:gap-0 lg:divide-x lg:divide-line">
        <section className="space-y-3 lg:pr-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-lg font-semibold text-ink">
                Standalone songs
              </h2>
              <p className="text-sm text-muted">Your latest individual scores.</p>
            </div>
            <Link
              href="/songs"
              className="shrink-0 text-sm text-accent hover:underline"
            >
              {mySongs.length > 0 ? "View all →" : "Rate a song →"}
            </Link>
          </div>
          {mySongs.length === 0 ? (
            <div className="card text-sm text-muted">
              No standalone song ratings yet.{" "}
              <Link href="/songs" className="text-accent hover:underline">
                Rate your first song →
              </Link>
            </div>
          ) : (
            <DashboardSongRatings ratings={mySongs} />
          )}
        </section>

        <section
          className="space-y-3 lg:px-6"
          data-tour="monthly-favourites"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-semibold text-ink">
              {formatMonthLabel(currentMonth)} favourites
            </h2>
            <Link
              href="/favourites"
              className="shrink-0 text-sm text-accent hover:underline"
            >
              {myPicks.length > 0 ? "Edit →" : "Add songs →"}
            </Link>
          </div>
          {myPicks.length === 0 ? (
            <div className="card text-sm text-muted">
              You haven&apos;t picked any favourites this month yet.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <MonthlyFavoritesCard picks={myPicks} />
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
                    <Avatar
                      url={friend.avatar}
                      name={friend.name}
                      size={24}
                    />
                    <span className="text-xs font-medium text-body">
                      {friend.name ?? "A friend"} · {friend.picks.length}{" "}
                      {friend.picks.length === 1 ? "pick" : "picks"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <div className="lg:pl-6">
          <ActivityFeed items={activity} initialLimit={3} />
        </div>
      </div>
    </div>
  );
}
