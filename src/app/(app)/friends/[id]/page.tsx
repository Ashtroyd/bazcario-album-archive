import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { AlbumCard } from "@/components/AlbumCard";
import { MonthlyFavoritesCard } from "@/components/MonthlyFavoritesCard";
import { cn, formatScore } from "@/lib/utils";
import { computeTasteMatch, matchColor } from "@/lib/tasteMatch";
import { formatMonthLabel, getMonthlyFavorites, monthKey } from "@/lib/monthlyFavorites";
import type { Album, Profile } from "@/lib/types";

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === id) redirect("/profile");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!profileData) notFound();
  const profile = profileData as Profile;

  const { data: friendship } = await supabase
    .from("friendships")
    .select("status")
    .or(
      `and(user_id.eq.${user!.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${user!.id})`,
    )
    .maybeSingle();
  const areFriends = friendship?.status === "accepted";

  const { data: ratingsData } = await supabase
    .from("ratings")
    .select("overall_rating, album:albums(*)")
    .eq("user_id", id)
    .order("overall_rating", { ascending: false, nullsFirst: false });

  const ratings = (ratingsData ?? []) as unknown as {
    overall_rating: number | null;
    album: Album | null;
  }[];
  const rated = ratings.filter((r) => r.album);
  const scored = rated
    .map((r) => r.overall_rating)
    .filter((n): n is number => n != null)
    .map(Number);
  const avg = scored.length
    ? scored.reduce((a, b) => a + b, 0) / scored.length
    : null;

  // Taste-match + shared-album stats.
  const { data: myRatingsData } = await supabase
    .from("ratings")
    .select("album_id, overall_rating")
    .eq("user_id", user!.id);
  const myOverall = new Map<string, number>();
  for (const r of myRatingsData ?? [])
    if (r.overall_rating != null)
      myOverall.set(r.album_id, Number(r.overall_rating));

  const sharedAlbums = rated.filter((r) => myOverall.has(r.album!.id));
  let biggestSplit: {
    title: string;
    mine: number;
    theirs: number;
    diff: number;
  } | null = null;
  for (const r of sharedAlbums) {
    const mineS = myOverall.get(r.album!.id)!;
    const theirsS = r.overall_rating != null ? Number(r.overall_rating) : null;
    if (theirsS == null) continue;
    const diff = Math.abs(mineS - theirsS);
    if (!biggestSplit || diff > biggestSplit.diff)
      biggestSplit = {
        title: r.album!.title,
        mine: mineS,
        theirs: theirsS,
        diff,
      };
  }

  let taste: { matchPct: number | null; sharedTracks: number } = {
    matchPct: null,
    sharedTracks: 0,
  };
  if (areFriends) {
    const [{ data: myTR }, { data: theirTR }] = await Promise.all([
      supabase
        .from("track_ratings")
        .select("track_id, rating")
        .eq("user_id", user!.id),
      supabase.from("track_ratings").select("track_id, rating").eq("user_id", id),
    ]);
    const myMap = new Map<string, number>(
      (myTR ?? []).map((r) => [r.track_id as string, Number(r.rating)]),
    );
    const theirMap = new Map<string, number>(
      (theirTR ?? []).map((r) => [r.track_id as string, Number(r.rating)]),
    );
    taste = computeTasteMatch(myMap, theirMap);
  }

  const currentMonth = monthKey();
  const monthlyPicks = areFriends
    ? await getMonthlyFavorites(supabase, id, currentMonth)
    : [];

  return (
    <div className="space-y-6">
      <Link href="/friends" className="text-sm text-zinc-400 hover:underline">
        ← Friends
      </Link>

      <div className="flex items-center gap-4">
        <Avatar url={profile.avatar_url} name={profile.display_name} size={64} />
        <div>
          <h1 className="text-2xl font-bold">
            {profile.display_name ?? "Friend"}
          </h1>
          <p className="text-sm text-zinc-400">
            {rated.length} album{rated.length === 1 ? "" : "s"} · avg{" "}
            {formatScore(avg)}
          </p>
        </div>
      </div>

      {areFriends && (taste.matchPct != null || sharedAlbums.length > 0) && (
        <div className="card flex flex-wrap items-center gap-x-8 gap-y-3">
          {taste.matchPct != null && (
            <div>
              <div
                className={cn("text-3xl font-bold", matchColor(taste.matchPct))}
              >
                {taste.matchPct}%
              </div>
              <div className="text-[10px] tracking-wide text-zinc-500 uppercase">
                Taste match · {taste.sharedTracks} shared track
                {taste.sharedTracks === 1 ? "" : "s"}
              </div>
            </div>
          )}
          <div className="space-y-0.5 text-sm text-zinc-400">
            <div>
              {sharedAlbums.length} shared album
              {sharedAlbums.length === 1 ? "" : "s"}
            </div>
            {biggestSplit && biggestSplit.diff > 0 && (
              <div>
                Biggest split:{" "}
                <span className="text-zinc-200">{biggestSplit.title}</span> (
                {formatScore(biggestSplit.mine)} vs{" "}
                {formatScore(biggestSplit.theirs)})
              </div>
            )}
          </div>
        </div>
      )}

      {areFriends && monthlyPicks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            {formatMonthLabel(currentMonth)} favourites
          </h2>
          <div className="card">
            <MonthlyFavoritesCard picks={monthlyPicks} />
          </div>
        </section>
      )}

      {!areFriends ? (
        <div className="card text-sm text-zinc-400">
          You&apos;re not friends yet — their ratings are private.
        </div>
      ) : rated.length === 0 ? (
        <div className="card text-sm text-zinc-400">No ratings yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rated.map((r) => (
            <div key={r.album!.id} className="space-y-1">
              <AlbumCard
                album={r.album!}
                myScore={
                  r.overall_rating != null ? Number(r.overall_rating) : null
                }
              />
              <Link
                href={`/album/${r.album!.id}/compare/${id}`}
                className="block text-center text-xs text-violet-400 hover:underline"
              >
                compare →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
