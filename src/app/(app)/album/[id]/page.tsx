import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { CoverImage } from "@/components/CoverImage";
import { ScoreBadge } from "@/components/ScoreBadge";
import { TrackRatingTable } from "@/components/TrackRatingTable";
import { RatingMetaForm } from "@/components/RatingMetaForm";
import { Comments } from "@/components/Comments";
import { AlbumActionsMenu } from "@/components/AlbumActionsMenu";
import { IconHeart, IconMoon } from "@/components/icons";
import { formatDate, formatScore } from "@/lib/utils";
import type {
  Album,
  CoverColors,
  Rating,
  ReplayValue,
  Track,
  TrackRating,
} from "@/lib/types";

type OtherRater = {
  user_id: string;
  overall_rating: number | null;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
};

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: tracksData } = await supabase
    .from("tracks")
    .select("*")
    .eq("album_id", id)
    .order("track_order");
  const tracks = (tracksData ?? []) as Track[];
  const trackIds = tracks.map((t) => t.id);

  const { data: myRatingData } = await supabase
    .from("ratings")
    .select("*")
    .eq("album_id", id)
    .eq("user_id", user!.id)
    .maybeSingle();
  const myRating = (myRatingData as Rating | null) ?? null;

  let myTrackRatings: TrackRating[] = [];
  if (trackIds.length > 0) {
    const { data } = await supabase
      .from("track_ratings")
      .select("*")
      .eq("user_id", user!.id)
      .in("track_id", trackIds);
    myTrackRatings = (data ?? []) as TrackRating[];
  }
  const trMap = new Map(myTrackRatings.map((tr) => [tr.track_id, tr]));

  // Friends' per-track scores (RLS returns only accepted friends / public).
  type FriendTR = {
    track_id: string;
    rating: number | string;
    profiles: { display_name: string | null; avatar_url: string | null } | null;
  };
  let friendTrackRatings: FriendTR[] = [];
  if (trackIds.length > 0) {
    const { data } = await supabase
      .from("track_ratings")
      .select("track_id, rating, profiles(display_name, avatar_url)")
      .in("track_id", trackIds)
      .neq("user_id", user!.id);
    friendTrackRatings = (data ?? []) as unknown as FriendTR[];
  }
  const friendScoreMap = new Map<
    string,
    { name: string | null; avatar: string | null; score: number }[]
  >();
  for (const ftr of friendTrackRatings) {
    const arr = friendScoreMap.get(ftr.track_id) ?? [];
    arr.push({
      name: ftr.profiles?.display_name ?? null,
      avatar: ftr.profiles?.avatar_url ?? null,
      score: Number(ftr.rating),
    });
    friendScoreMap.set(ftr.track_id, arr);
  }

  const { data: othersData } = await supabase
    .from("ratings")
    .select("user_id, overall_rating, profiles(display_name, avatar_url)")
    .eq("album_id", id)
    .neq("user_id", user!.id);
  const others = (othersData ?? []) as unknown as OtherRater[];

  const tableTracks = tracks.map((t) => {
    const tr = trMap.get(t.id);
    return {
      id: t.id,
      name: t.name,
      order: t.track_order,
      rating: tr?.rating != null ? Number(tr.rating) : null,
      replay: (tr?.replay_value ?? null) as ReplayValue | null,
      notes: tr?.notes ?? null,
      friends: friendScoreMap.get(t.id) ?? [],
    };
  });

  const isOwner = a.created_by === user!.id;
  const favName = tracks.find((t) => t.id === myRating?.favorite_track_id)?.name;
  const leastName = tracks.find(
    (t) => t.id === myRating?.least_favorite_track_id,
  )?.name;

  // Apple-Music-style tint from the cover art (falls back to the dark theme).
  const colors = (a.cover_colors as CoverColors | null) ?? null;
  const bg = colors?.bg ?? "#18181b";
  const heroText = colors?.text ?? "#ffffff";
  const accent = colors?.accent ?? "#a78bfa";
  const heroGradient = `linear-gradient(180deg, ${bg} 0%, ${bg}00 82%)`;
  const chipStyle = { color: heroText, borderColor: `${heroText}33` };

  return (
    <div className="space-y-8">
      {/* Cover-tinted hero */}
      <div
        className="relative -mx-4 -mt-6 px-4 pt-10 pb-8"
        style={{ background: heroGradient }}
      >
        <div className="absolute top-3 right-4">
          <AlbumActionsMenu albumId={a.id} title={a.title} isOwner={isOwner} />
        </div>
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <CoverImage
            url={a.cover_image_url}
            alt={a.title}
            className="aspect-square w-44 rounded-2xl shadow-2xl sm:w-56"
          />
          <h1
            className="mt-4 text-2xl font-bold sm:text-3xl"
            style={{ color: heroText }}
          >
            {a.title}
          </h1>
          <p
            className="text-base sm:text-lg"
            style={{ color: heroText, opacity: 0.75 }}
          >
            {a.artist}
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {a.release_year && (
              <span
                className="rounded-full border bg-white/10 px-2.5 py-0.5 text-xs"
                style={chipStyle}
              >
                {a.release_year}
              </span>
            )}
            {a.genre && (
              <span
                className="rounded-full border bg-white/10 px-2.5 py-0.5 text-xs"
                style={chipStyle}
              >
                {a.genre}
              </span>
            )}
          </div>

          <div className="mt-5">
            {myRating?.overall_rating != null ? (
              <>
                <div
                  className="text-5xl font-bold tabular-nums"
                  style={{ color: accent }}
                >
                  {formatScore(Number(myRating.overall_rating))}
                </div>
                <div
                  className="text-[10px] tracking-widest uppercase"
                  style={{ color: heroText, opacity: 0.6 }}
                >
                  Your overall
                </div>
              </>
            ) : (
              <div className="text-sm" style={{ color: heroText, opacity: 0.6 }}>
                Not rated yet — rate the tracks below
              </div>
            )}
          </div>

          {(myRating?.first_listen_date || favName || leastName) && (
            <div
              className="mt-3 space-y-0.5 text-sm"
              style={{ color: heroText, opacity: 0.8 }}
            >
              {myRating?.first_listen_date && (
                <div>First listen: {formatDate(myRating.first_listen_date)}</div>
              )}
              {favName && (
                <div className="flex items-center justify-center gap-1.5">
                  <IconHeart size={14} />
                  <span style={{ opacity: 0.7 }}>Favourite:</span> {favName}
                </div>
              )}
              {leastName && (
                <div className="flex items-center justify-center gap-1.5">
                  <IconMoon size={14} />
                  <span style={{ opacity: 0.7 }}>Least favourite:</span>{" "}
                  {leastName}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-8">
        {/* Friends who also rated */}
        {others.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Also rated by
            </h2>
            <div className="flex flex-wrap gap-2">
              {others.map((o) => (
                <Link
                  key={o.user_id}
                  href={`/album/${id}/compare/${o.user_id}`}
                  className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 transition hover:border-zinc-600"
                >
                  <Avatar
                    url={o.profiles?.avatar_url}
                    name={o.profiles?.display_name}
                    size={28}
                  />
                  <span className="text-sm">
                    {o.profiles?.display_name ?? "Friend"}
                  </span>
                  <ScoreBadge
                    score={
                      o.overall_rating != null ? Number(o.overall_rating) : null
                    }
                  />
                  <span className="text-xs text-violet-400">compare →</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Editable track ratings */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your track ratings</h2>
          {tracks.length === 0 ? (
            <p className="text-sm text-zinc-500">This album has no tracks yet.</p>
          ) : (
            <div className="card">
              <TrackRatingTable albumId={a.id} tracks={tableTracks} />
              <p className="mt-2 text-xs text-zinc-500">
                Your overall updates automatically as you rate tracks.
              </p>
            </div>
          )}
        </section>

        {/* Album-level details */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Album details</h2>
          <RatingMetaForm albumId={a.id} tracks={tracks} rating={myRating} />
        </section>

        {/* Comments */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Comments</h2>
          <div className="card">
            <Comments
              targetType="album"
              targetId={a.id}
              revalidate={`/album/${a.id}`}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
