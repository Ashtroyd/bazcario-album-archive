import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth";
import { AlbumCard } from "@/components/AlbumCard";
import { Avatar } from "@/components/Avatar";
import { ScoreBadge } from "@/components/ScoreBadge";
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

  const { data: actData } = await supabase
    .from("ratings")
    .select(
      "user_id, overall_rating, updated_at, album:albums(id,title,artist,cover_image_url), rater:profiles(display_name, avatar_url)",
    )
    .neq("user_id", user!.id)
    .order("updated_at", { ascending: false })
    .limit(12);
  const activity = (actData ?? []) as unknown as {
    user_id: string;
    overall_rating: number | null;
    album: { id: string; title: string } | null;
    rater: { display_name: string | null; avatar_url: string | null } | null;
  }[];
  const acts = activity.filter((a) => a.album);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""} 👋
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
        <h2 className="text-lg font-semibold">Friends&apos; recent ratings</h2>
        {acts.length === 0 ? (
          <div className="card text-sm text-zinc-400">
            No friend activity yet.{" "}
            <Link href="/friends" className="text-violet-400 hover:underline">
              Add friends →
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {acts.map((a, i) => (
              <li key={i}>
                <Link
                  href={`/album/${a.album!.id}`}
                  className="card flex items-center gap-3 py-3 transition hover:border-zinc-700"
                >
                  <Avatar
                    url={a.rater?.avatar_url}
                    name={a.rater?.display_name}
                    size={32}
                  />
                  <span className="text-sm">
                    <span className="font-medium">
                      {a.rater?.display_name ?? "A friend"}
                    </span>{" "}
                    rated{" "}
                    <span className="font-medium">{a.album!.title}</span>
                  </span>
                  <span className="ml-auto">
                    <ScoreBadge
                      score={
                        a.overall_rating != null
                          ? Number(a.overall_rating)
                          : null
                      }
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
