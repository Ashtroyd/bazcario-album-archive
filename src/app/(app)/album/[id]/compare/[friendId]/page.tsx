import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { CoverImage } from "@/components/CoverImage";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ReplayBadge } from "@/components/ReplayBadge";
import { Comments } from "@/components/Comments";
import { IconHeart, IconMoon } from "@/components/icons";
import { cn, formatDate, formatScore } from "@/lib/utils";
import type { Album, CoverColors, ReplayValue, Track } from "@/lib/types";

const NIL = "00000000-0000-0000-0000-000000000000";

type Side = {
  rating: number | null;
  replay: ReplayValue | null;
  notes: string | null;
} | null;

type RatingRow = {
  user_id: string;
  overall_rating: number | null;
  first_listen_date: string | null;
  favorite_track_id: string | null;
  least_favorite_track_id: string | null;
  notes: string | null;
};

function gapBg(gap: number | null): string {
  if (gap == null) return "bg-surface";
  if (gap >= 3) return "bg-accent-soft";
  if (gap >= 1.5) return "bg-star/10";
  return "bg-surface";
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

  const [{ data: friendProfile }, { data: myProfile }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", friendId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user!.id)
      .maybeSingle(),
  ]);

  const { data: tracksData } = await supabase
    .from("tracks")
    .select("*")
    .eq("album_id", id)
    .order("track_order");
  const tracks = (tracksData ?? []) as Track[];
  const trackIds = tracks.map((t) => t.id);
  const inIds = trackIds.length ? trackIds : [NIL];

  const [{ data: mineTR }, { data: theirsTR }, { data: ratingRows }] =
    await Promise.all([
      supabase
        .from("track_ratings")
        .select("track_id, rating, replay_value, notes")
        .eq("user_id", user!.id)
        .in("track_id", inIds),
      supabase
        .from("track_ratings")
        .select("track_id, rating, replay_value, notes")
        .eq("user_id", friendId)
        .in("track_id", inIds),
      supabase
        .from("ratings")
        .select(
          "user_id, overall_rating, first_listen_date, favorite_track_id, least_favorite_track_id, notes",
        )
        .eq("album_id", id)
        .in("user_id", [user!.id, friendId]),
    ]);

  const toSide = (r: {
    rating: number | string | null;
    replay_value: string | null;
    notes: string | null;
  }): Side => ({
    rating: r.rating != null ? Number(r.rating) : null,
    replay: (r.replay_value ?? null) as ReplayValue | null,
    notes: r.notes ?? null,
  });
  const myTR = new Map<string, Side>(
    (mineTR ?? []).map((r) => [r.track_id as string, toSide(r)]),
  );
  const frTR = new Map<string, Side>(
    (theirsTR ?? []).map((r) => [r.track_id as string, toSide(r)]),
  );

  const rows = (ratingRows ?? []) as RatingRow[];
  const myRating = rows.find((r) => r.user_id === user!.id) ?? null;
  const frRating = rows.find((r) => r.user_id === friendId) ?? null;
  const trackName = (tid: string | null) =>
    tracks.find((t) => t.id === tid)?.name ?? null;

  const trackRows = tracks.map((t) => {
    const mine = myTR.get(t.id) ?? null;
    const theirs = frTR.get(t.id) ?? null;
    const gap =
      mine?.rating != null && theirs?.rating != null
        ? Math.abs(mine.rating - theirs.rating)
        : null;
    return { id: t.id, name: t.name, order: t.track_order, mine, theirs, gap };
  });
  const biggest = [...trackRows]
    .filter((r) => r.gap != null)
    .sort((x, y) => y.gap! - x.gap!)[0];

  const friendName = friendProfile?.display_name ?? "Friend";
  const theyHaveData = (theirsTR ?? []).length > 0 || frRating != null;

  // Taste match on this album, from shared track ratings.
  let matchSum = 0;
  let matchN = 0;
  for (const r of trackRows) {
    if (r.mine?.rating != null && r.theirs?.rating != null) {
      matchSum += Math.abs(r.mine.rating - r.theirs.rating);
      matchN += 1;
    }
  }
  const albumMatch =
    matchN > 0 ? Math.round(100 * (1 - matchSum / matchN / 10)) : null;

  const colors = (a.cover_colors as CoverColors | null) ?? null;
  const bg = colors?.bg ?? "#3a3632";
  const heroText = colors?.text ?? "#ffffff";
  const accent = colors?.accent ?? "#f4d9cc";
  const heroGradient = `linear-gradient(165deg, ${bg} 0%, ${bg} 55%, rgba(0,0,0,0.14) 100%)`;

  return (
    <div className="space-y-6">
      {/* Cover-tinted header card */}
      <div
        className="overflow-hidden rounded-2xl px-4 pt-6 pb-5 shadow-[0_8px_24px_rgba(38,37,33,0.16)]"
        style={{ background: heroGradient }}
      >
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <CoverImage
            url={a.cover_image_url}
            alt={a.title}
            className="h-20 w-20 shrink-0 rounded-lg shadow-lg"
          />
          <div className="min-w-0">
            <Link
              href={`/album/${id}`}
              className="text-xs hover:underline"
              style={{ color: heroText, opacity: 0.7 }}
            >
              ← back to album
            </Link>
            <h1
              className="truncate text-xl font-bold sm:text-2xl"
              style={{ color: heroText }}
            >
              {a.title}
            </h1>
            <p
              className="truncate text-sm"
              style={{ color: heroText, opacity: 0.75 }}
            >
              Your ratings vs {friendName}
            </p>
            {albumMatch != null && (
              <p
                className="mt-0.5 text-xs font-semibold"
                style={{ color: accent }}
              >
                {albumMatch}% taste match on this album
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Person headers */}
        <div className="grid grid-cols-2 gap-3">
          <PersonHeader
            name="You"
            avatarUrl={myProfile?.avatar_url}
            avatarName={myProfile?.display_name}
            overall={
              myRating?.overall_rating != null
                ? Number(myRating.overall_rating)
                : null
            }
            accent={accent}
          />
          <PersonHeader
            name={friendName}
            avatarUrl={friendProfile?.avatar_url}
            overall={
              frRating?.overall_rating != null
                ? Number(frRating.overall_rating)
                : null
            }
            accent={accent}
          />
        </div>

        {!theyHaveData ? (
          <div className="card space-y-3 text-sm text-muted">
            <p>
              Nothing to compare yet — {friendName} hasn&apos;t rated this
              album (or you&apos;re not friends).
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/album/${id}`} className="btn btn-outline text-sm">
                View album
              </Link>
              <Link
                href={`/friends/${friendId}`}
                className="btn btn-ghost text-sm"
              >
                See {friendName}&apos;s profile
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Album details, side by side */}
            <section className="space-y-2">
              <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
                Album details
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <DetailColumn rating={myRating} trackName={trackName} />
                <DetailColumn rating={frRating} trackName={trackName} />
              </div>
            </section>

            {biggest && biggest.gap! > 0 && (
              <div className="rounded-lg border border-line bg-surface px-4 py-3 text-sm shadow-[0_1px_2px_rgba(38,37,33,0.06)]">
                <span className="text-muted">Biggest gap: </span>
                <span className="font-medium text-ink">{biggest.name}</span>{" "}
                <span className="text-muted">
                  — you {formatScore(biggest.mine?.rating ?? null)} vs{" "}
                  {friendName} {formatScore(biggest.theirs?.rating ?? null)} (Δ{" "}
                  {formatScore(biggest.gap)})
                </span>
              </div>
            )}

            {/* Per-track comparison */}
            <section className="space-y-2">
              <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
                Tracks
              </h2>
              <div className="space-y-2">
                {trackRows.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      "rounded-xl border border-line p-3 shadow-[0_1px_2px_rgba(38,37,33,0.06)]",
                      gapBg(r.gap),
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs text-muted">{r.order}</span>
                      <span className="font-medium text-ink">{r.name}</span>
                      {r.gap != null && r.gap > 0 && (
                        <span className="ml-auto text-xs text-muted">
                          Δ {formatScore(r.gap)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <TrackSide side={r.mine} label="You" />
                      <TrackSide side={r.theirs} label={friendName} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Shared comments */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Comments
          </h2>
          <div className="card">
            <Comments
              targetType="album"
              targetId={a.id}
              revalidate={`/album/${id}/compare/${friendId}`}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function PersonHeader({
  name,
  avatarUrl,
  avatarName,
  overall,
  accent,
}: {
  name: string;
  avatarUrl?: string | null;
  avatarName?: string | null;
  overall: number | null;
  accent: string;
}) {
  return (
    <div className="card flex items-center gap-3 py-3">
      <Avatar url={avatarUrl} name={avatarName ?? name} size={40} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-ink">{name}</div>
        {overall != null ? (
          <div
            className="text-2xl font-bold tabular-nums"
            style={{ color: accent }}
          >
            {formatScore(overall)}
          </div>
        ) : (
          <div className="text-2xl font-bold text-muted">—</div>
        )}
      </div>
    </div>
  );
}

function DetailColumn({
  rating,
  trackName,
}: {
  rating: RatingRow | null;
  trackName: (tid: string | null) => string | null;
}) {
  const fav = trackName(rating?.favorite_track_id ?? null);
  const least = trackName(rating?.least_favorite_track_id ?? null);
  const hasAny =
    rating && (rating.first_listen_date || fav || least || rating.notes);

  return (
    <div className="card space-y-1.5 text-sm">
      {!hasAny ? (
        <p className="text-muted">No details.</p>
      ) : (
        <>
          {rating?.first_listen_date && (
            <div className="text-body">
              <span className="text-muted">First listen: </span>
              {formatDate(rating.first_listen_date)}
            </div>
          )}
          {fav && (
            <div className="flex items-center gap-1.5 text-body">
              <IconHeart size={13} className="shrink-0 text-muted" />
              <span className="text-muted">Favourite:</span> {fav}
            </div>
          )}
          {least && (
            <div className="flex items-center gap-1.5 text-body">
              <IconMoon size={13} className="shrink-0 text-muted" />
              <span className="text-muted">Least favourite:</span> {least}
            </div>
          )}
          {rating?.notes && (
            <p className="whitespace-pre-wrap text-muted">{rating.notes}</p>
          )}
        </>
      )}
    </div>
  );
}

function TrackSide({ side, label }: { side: Side; label: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[10px] tracking-wide text-muted uppercase sm:hidden">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <ScoreBadge score={side?.rating ?? null} />
        <ReplayBadge value={side?.replay ?? null} />
      </div>
      {side?.notes ? (
        <p className="mt-1 text-xs whitespace-pre-wrap text-muted">
          {side.notes}
        </p>
      ) : side?.rating == null ? (
        <p className="mt-1 text-xs text-muted">not rated</p>
      ) : null}
    </div>
  );
}
