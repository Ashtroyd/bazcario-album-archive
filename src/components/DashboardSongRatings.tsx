import Link from "next/link";
import { CoverImage } from "@/components/CoverImage";
import { ReplayBadge } from "@/components/ReplayBadge";
import { ScoreBadge } from "@/components/ScoreBadge";
import { formatScore } from "@/lib/utils";
import type { SongWithMyRating } from "@/lib/types";

export function DashboardSongRatings({
  ratings,
}: {
  ratings: SongWithMyRating[];
}) {
  return (
    <div className="grid gap-2.5">
      {ratings.map((song) => (
        <Link
          key={song.id}
          href="/songs"
          aria-label={`Edit ${song.title} rating, your score ${formatScore(song.my_rating.rating)}`}
          className="group flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-line bg-surface p-2.5 shadow-[0_1px_2px_rgba(38,37,33,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_10px_24px_rgba(38,37,33,0.12)] motion-reduce:transform-none"
        >
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
            <CoverImage
              url={song.cover_image_url}
              alt={`${song.title} artwork`}
              className="h-full w-full transition duration-300 group-hover:scale-[1.04] motion-reduce:transform-none"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-ink">{song.title}</div>
            <div className="truncate text-sm text-body">{song.artist}</div>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              {song.album_title ? (
                <span className="min-w-0 truncate text-xs text-muted">
                  {song.album_title}
                </span>
              ) : null}
              <ReplayBadge
                value={song.my_rating.replay_value}
                className="shrink-0"
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end border-l border-line pl-3">
            <ScoreBadge score={song.my_rating.rating} className="text-xl" />
            <span className="text-[9px] font-medium tracking-[0.12em] text-muted uppercase">
              Your score
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
