import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { ScoreBadge } from "@/components/ScoreBadge";
import { cn, formatScore } from "@/lib/utils";
import type { Album, Track } from "@/lib/types";

const NIL = "00000000-0000-0000-0000-000000000000";

function gapRowClass(gap: number | null): string {
  if (gap == null) return "";
  if (gap >= 3) return "bg-red-950/40";
  if (gap >= 1.5) return "bg-amber-950/25";
  return "";
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ id: string; friendId: string }>;
}) {
  const { id, friendId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: album } = await supabase
    .from("albums")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!album) notFound();
  const a = album as Album;

  const { data: friendProfile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", friendId)
    .maybeSingle();

  const { data: tracksData } = await supabase
    .from("tracks")
    .select("*")
    .eq("album_id", id)
    .order("track_order");
  const tracks = (tracksData ?? []) as Track[];
  const trackIds = tracks.map((t) => t.id);
  const inIds = trackIds.length ? trackIds : [NIL];

  const [{ data: mine }, { data: theirs }, { data: overalls }] =
    await Promise.all([
      supabase
        .from("track_ratings")
        .select("track_id, rating")
        .eq("user_id", user!.id)
        .in("track_id", inIds),
      supabase
        .from("track_ratings")
        .select("track_id, rating")
        .eq("user_id", friendId)
        .in("track_id", inIds),
      supabase
        .from("ratings")
        .select("user_id, overall_rating")
        .eq("album_id", id)
        .in("user_id", [user!.id, friendId]),
    ]);

  const myMap = new Map(
    (mine ?? []).map((r) => [r.track_id as string, Number(r.rating)]),
  );
  const theirMap = new Map(
    (theirs ?? []).map((r) => [r.track_id as string, Number(r.rating)]),
  );
  const overallMap = new Map(
    (overalls ?? []).map((r) => [
      r.user_id as string,
      r.overall_rating != null ? Number(r.overall_rating) : null,
    ]),
  );

  const rows = tracks.map((t) => {
    const m = myMap.get(t.id) ?? null;
    const th = theirMap.get(t.id) ?? null;
    const gap = m != null && th != null ? Math.abs(m - th) : null;
    return { id: t.id, name: t.name, order: t.track_order, mine: m, theirs: th, gap };
  });
  const biggest = [...rows]
    .filter((r) => r.gap != null)
    .sort((x, y) => y.gap! - x.gap!)[0];

  const friendName = friendProfile?.display_name ?? "Friend";
  const theyHaveData = (theirs ?? []).length > 0 || overallMap.get(friendId) != null;

  return (
    <div className="space-y-6">
      <Link
        href={`/album/${id}`}
        className="text-sm text-zinc-400 hover:underline"
      >
        ← {a.title}
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Track-by-track comparison</h1>
        <p className="text-zinc-400">
          {a.title} — {a.artist}
        </p>
      </div>

      {/* Overalls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="card flex items-center gap-3 py-3">
          <Avatar name="You" size={36} />
          <div>
            <div className="text-xs text-zinc-500">You</div>
            <ScoreBadge score={overallMap.get(user!.id) ?? null} className="text-xl" />
          </div>
        </div>
        <span className="text-zinc-600">vs</span>
        <div className="card flex items-center gap-3 py-3">
          <Avatar
            url={friendProfile?.avatar_url}
            name={friendProfile?.display_name}
            size={36}
          />
          <div>
            <div className="text-xs text-zinc-500">{friendName}</div>
            <ScoreBadge score={overallMap.get(friendId) ?? null} className="text-xl" />
          </div>
        </div>
      </div>

      {!theyHaveData ? (
        <div className="card text-sm text-zinc-400">
          You can&apos;t see {friendName}&apos;s ratings for this album (they
          haven&apos;t rated it, or you&apos;re not friends).
        </div>
      ) : (
        <>
          {biggest && biggest.gap! > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm">
              <span className="text-zinc-400">Biggest gap: </span>
              <span className="font-medium">{biggest.name}</span>{" "}
              <span className="text-zinc-400">
                — you {formatScore(biggest.mine)} vs {friendName}{" "}
                {formatScore(biggest.theirs)} (Δ {formatScore(biggest.gap)})
              </span>
            </div>
          )}

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs tracking-wide text-zinc-500 uppercase">
                  <th className="w-8 py-2 font-medium">#</th>
                  <th className="py-2 font-medium">Song</th>
                  <th className="w-20 py-2 text-center font-medium">You</th>
                  <th className="w-28 py-2 text-center font-medium">
                    {friendName}
                  </th>
                  <th className="w-16 py-2 text-center font-medium">Δ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={cn("border-b border-zinc-900", gapRowClass(r.gap))}
                  >
                    <td className="py-2 text-zinc-500">{r.order}</td>
                    <td className="py-2 pr-2 font-medium">{r.name}</td>
                    <td className="py-2 text-center">
                      <ScoreBadge score={r.mine} />
                    </td>
                    <td className="py-2 text-center">
                      <ScoreBadge score={r.theirs} />
                    </td>
                    <td className="py-2 text-center tabular-nums text-zinc-400">
                      {r.gap != null ? formatScore(r.gap) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
