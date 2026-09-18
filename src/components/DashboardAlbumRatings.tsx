import Link from "next/link";
import { CoverImage } from "@/components/CoverImage";
import { formatScore } from "@/lib/utils";
import type { Album } from "@/lib/types";

type RecentAlbumRating = {
  album: Album;
  score: number | null;
};

export function DashboardAlbumRatings({
  ratings,
}: {
  ratings: RecentAlbumRating[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ratings.map(({ album, score }, index) => (
        <Link
          key={album.id}
          href={`/album/${album.id}`}
          aria-label={`${album.title} by ${album.artist}, ${score == null ? "rating in progress" : `your score ${formatScore(score)}`}`}
          className="list-in group flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-line bg-surface p-2.5 shadow-[0_1px_2px_rgba(38,37,33,0.06)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_10px_24px_rgba(38,37,33,0.12)] motion-reduce:transform-none"
          style={{ animationDelay: `${index * 45}ms` }}
        >
          <div className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-lg">
            <CoverImage
              url={album.cover_image_url}
              alt=""
              className="h-full w-full transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transform-none"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col self-stretch py-0.5">
            <p className="line-clamp-2 text-sm leading-tight font-medium text-ink">
              {album.title}
            </p>
            <p className="mt-1 truncate text-xs text-muted">{album.artist}</p>
            <div className="mt-auto flex items-end justify-between gap-2 pt-1">
              <span className="text-[9px] font-semibold tracking-[0.12em] text-muted uppercase">
                {score == null ? "In progress" : "Your score"}
              </span>
              <span className="font-serif text-xl leading-none font-bold tabular-nums text-ink">
                {score == null ? "–" : formatScore(score)}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
