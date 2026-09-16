import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { CoverImage } from "@/components/CoverImage";
import { ScoreBadge } from "@/components/ScoreBadge";
import { formatScore } from "@/lib/utils";
import type { Album } from "@/lib/types";

export type AlbumCardRating =
  | { kind: "self"; score: number | null }
  | {
      kind: "friend";
      score: number | null;
      name: string | null;
      avatarUrl: string | null;
      additionalCount?: number;
    }
  | { kind: "unrated" };

function RatingProvenance({ rating }: { rating: AlbumCardRating }) {
  if (rating.kind === "self") {
    return (
      <div className="mt-auto flex min-h-9 items-center justify-between gap-2 rounded-lg bg-ink px-2.5 py-1.5 text-paper shadow-[0_3px_10px_rgba(38,37,33,0.12)]">
        <span className="truncate text-xs font-medium">
          {rating.score == null ? "Your rating in progress" : "Your score"}
        </span>
        {rating.score != null ? (
          <span className="text-sm font-semibold tabular-nums text-paper">
            {formatScore(rating.score)}
          </span>
        ) : null}
      </div>
    );
  }

  if (rating.kind === "friend") {
    const name = rating.name?.trim() || "A friend";
    return (
      <div className="mt-auto flex min-h-9 items-center gap-2 rounded-lg border border-line bg-ivory px-2 py-1.5 transition-colors group-hover:border-line-strong">
        <Avatar url={rating.avatarUrl} name={name} size={21} />
        <span className="min-w-0 flex-1 truncate text-xs text-body">
          <span className="font-medium text-ink">{name}</span>{" "}
          {rating.score == null ? "started rating" : "rated"}
        </span>
        {rating.score != null ? (
          <ScoreBadge score={rating.score} className="text-sm" />
        ) : null}
        {(rating.additionalCount ?? 0) > 0 ? (
          <span
            className="rounded-full border border-line-strong bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted"
            aria-label={`${rating.additionalCount} more friend${rating.additionalCount === 1 ? "" : "s"} rated this album`}
          >
            +{rating.additionalCount}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-auto flex min-h-9 items-center rounded-lg border border-dashed border-line-strong px-2.5 py-1.5 text-xs text-muted transition-colors group-hover:bg-ivory">
      Not rated by you
    </div>
  );
}

export function AlbumCard({
  album,
  rating,
}: {
  album: Album;
  rating: AlbumCardRating;
}) {
  return (
    <Link
      href={`/album/${album.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(38,37,33,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_12px_28px_rgba(38,37,33,0.14)]"
    >
      <div className="relative aspect-square w-full">
        <CoverImage
          url={album.cover_image_url}
          alt={`${album.title} cover`}
          className="h-full w-full transition duration-300 group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="truncate font-medium text-ink" title={album.title}>
          {album.title}
        </div>
        <div className="truncate text-sm text-muted" title={album.artist}>
          {album.artist}
        </div>
        <div className="mt-1 mb-3 flex gap-1.5 text-xs text-muted">
          {album.release_year && <span>{album.release_year}</span>}
          {album.genre && (
            <>
              {album.release_year && <span>·</span>}
              <span className="truncate">{album.genre}</span>
            </>
          )}
        </div>
        <RatingProvenance rating={rating} />
      </div>
    </Link>
  );
}
