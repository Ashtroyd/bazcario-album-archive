import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { AlbumCard } from "@/components/AlbumCard";
import { formatScore } from "@/lib/utils";
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
