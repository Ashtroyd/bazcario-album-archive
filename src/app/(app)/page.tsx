import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth";
import { AlbumCard } from "@/components/AlbumCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { MonthlyFavoritesCard } from "@/components/MonthlyFavoritesCard";
import { getFriendActivity } from "@/lib/activity";
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
  const profile = await getMyProfile();

  const { data: mineData } = await supabase
    .from("ratings")
    .select("overall_rating, updated_at, album:albums(*)")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false })
    .limit(8);
  const mine = (mineData ?? []) as unknown as {
    overall_rating: number | null;
    album: Album | null;
  }[];
  const myAlbums = mine.filter((r) => r.album);

  const { data: fr } = await supabase
    .from("friendships")
    .select("user_id, friend_id")
    .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
    .eq("status", "accepted");
  const friendIds = (fr ?? []).map((f) =>
    f.user_id === user!.id ? f.friend_id : f.user_id,
  ) as string[];

  const activity = await getFriendActivity(supabase, user!.id, friendIds);

  const currentMonth = monthKey();
  const [myPicks, friendsPicks] = await Promise.all([
    getMonthlyFavorites(supabase, user!.id, currentMonth),
    getFriendsMonthlyFavorites(supabase, friendIds, currentMonth),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        <p className="text-zinc-400">Your album ratings, synced everywhere.</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your albums</h2>
          <Link href="/albums" className="text-sm text-violet-400 hover:underline">
            View all →
          </Link>
        </div>
        {myAlbums.length === 0 ? (
          <div className="card text-sm text-zinc-400">
            You haven&apos;t rated anything yet.{" "}
            <Link href="/album/new" className="text-violet-400 hover:underline">
              Add an album →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {myAlbums.map((r) => (
              <AlbumCard
                key={r.album!.id}
                album={r.album!}
                myScore={
                  r.overall_rating != null ? Number(r.overall_rating) : null
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {formatMonthLabel(currentMonth)} favourites
          </h2>
          <Link
            href="/favourites"
            className="text-sm text-violet-400 hover:underline"
          >
            {myPicks.length > 0 ? "Edit →" : "Add songs →"}
          </Link>
        </div>
        {myPicks.length === 0 ? (
          <div className="card text-sm text-zinc-400">
            You haven&apos;t picked any favourite songs this month yet.{" "}
            <Link href="/favourites" className="text-violet-400 hover:underline">
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
                <div className="mb-2 text-sm font-medium text-zinc-300">
                  {f.name ?? "A friend"}&apos;s picks
                </div>
                <MonthlyFavoritesCard picks={f.picks} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Activity</h2>
        <ActivityFeed items={activity} />
      </section>
    </div>
  );
}
