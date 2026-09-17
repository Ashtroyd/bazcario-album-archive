import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth";
import { AlbumCard } from "@/components/AlbumCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { DashboardSongRatings } from "@/components/DashboardSongRatings";
import { MonthlyFavoritesCard } from "@/components/MonthlyFavoritesCard";
import { getFriendActivity } from "@/lib/activity";
import { getMySongRatings } from "@/lib/songRatings";
import {
  formatMonthLabel,
  getFriendsMonthlyFavorites,
  getMonthlyFavorites,
  monthKey,
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
        .limit(8),
      supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
        .eq("status", "accepted"),
      getMySongRatings(supabase, user!.id, 4),
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
    <div className="space-y-8">
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {myAlbums.map((r) => (
              <AlbumCard
                key={r.album!.id}
                album={r.album!}
                rating={{
                  kind: "self",
                  score:
                    r.overall_rating != null ? Number(r.overall_rating) : null,
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink">
              Standalone song ratings
            </h2>
            <p className="text-sm text-muted">
              Individual scores that stay separate from album averages.
            </p>
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
            You haven&apos;t rated a standalone song yet.{" "}
            <Link href="/songs" className="text-accent hover:underline">
              Rate one without changing an album average →
            </Link>
          </div>
        ) : (
          <DashboardSongRatings ratings={mySongs} />
        )}
      </section>

      <section className="space-y-3" data-tour="monthly-favourites">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-ink">
            {formatMonthLabel(currentMonth)} favourites
          </h2>
          <Link
            href="/favourites"
            className="text-sm text-accent hover:underline"
          >
            {myPicks.length > 0 ? "Edit →" : "Add songs →"}
          </Link>
        </div>
        {myPicks.length === 0 ? (
          <div className="card text-sm text-muted">
            You haven&apos;t picked any favourite songs this month yet.{" "}
            <Link href="/favourites" className="text-accent hover:underline">
              Add up to 5 →
            </Link>
          </div>
        ) : (
          <div className="card">
            <MonthlyFavoritesCard picks={myPicks} />
          </div>
        )}

        {friendsPicks.length > 0 && (
          <div className="space-y-3 pt-1">
            {friendsPicks.map((f) => (
              <div key={f.userId} className="card">
                <div className="mb-2 text-sm font-medium text-body">
                  {f.name ?? "A friend"}&apos;s picks
                </div>
                <MonthlyFavoritesCard picks={f.picks} />
              </div>
            ))}
          </div>
        )}
      </section>

      <ActivityFeed items={activity} />
    </div>
  );
}
