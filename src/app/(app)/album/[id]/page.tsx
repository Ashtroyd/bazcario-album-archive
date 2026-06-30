import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { CoverImage } from "@/components/CoverImage";
import { ScoreBadge, ScoreCircle } from "@/components/ScoreBadge";
import { TrackRatingTable } from "@/components/TrackRatingTable";
import { RatingMetaForm } from "@/components/RatingMetaForm";
import { DeleteAlbumButton } from "@/components/DeleteAlbumButton";
import { Comments } from "@/components/Comments";
import { CoverEditor } from "@/components/CoverEditor";
import { formatDate } from "@/lib/utils";
import type { Album, Rating, ReplayValue, Track, TrackRating } from "@/lib/types";

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
    };
  });

  const isOwner = a.created_by === user!.id;
  const favName = tracks.find((t) => t.id === myRating?.favorite_track_id)?.name;
  const leastName = tracks.find(
    (t) => t.id === myRating?.least_favorite_track_id,
  )?.name;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="w-full max-w-[220px]">
          <CoverImage
            url={a.cover_image_url}
            alt={a.title}
            className="aspect-square w-full rounded-xl"
          />
          {isOwner && <CoverEditor albumId={a.id} />}
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">{a.title}</h1>
              <p className="text-lg text-zinc-400">{a.artist}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {a.release_year && <span className="chip">{a.release_year}</span>}
                {a.genre && <span className="chip">{a.genre}</span>}
              </div>
            </div>
            {isOwner && <DeleteAlbumButton albumId={a.id} />}
          </div>

          <div className="mt-auto flex flex-wrap items-end gap-4 pt-4">
            <ScoreCircle
              score={
                myRating?.overall_rating != null
                  ? Number(myRating.overall_rating)
                  : null
              }
              label="Your overall"
            />
            <div className="space-y-0.5 text-sm text-zinc-400">
              {myRating?.first_listen_date && (
                <div>First listen: {formatDate(myRating.first_listen_date)}</div>
              )}
              {favName && <div>❤️ Favorite: {favName}</div>}
              {leastName && <div>💤 Least favorite: {leastName}</div>}
            </div>
          </div>
        </div>
      </div>

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
  );
}
