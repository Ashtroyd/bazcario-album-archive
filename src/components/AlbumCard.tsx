import Link from "next/link";
import { CoverImage } from "@/components/CoverImage";
import { ScoreBadge } from "@/components/ScoreBadge";
import type { Album } from "@/lib/types";

export function AlbumCard({
  album,
  myScore,
}: {
  album: Album;
  myScore?: number | null;
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
        {myScore != null && (
          <span className="absolute top-2 right-2 rounded-lg bg-surface/90 px-2 py-1 text-sm shadow-sm backdrop-blur">
            <ScoreBadge score={myScore} />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="truncate font-medium text-ink" title={album.title}>
          {album.title}
        </div>
        <div className="truncate text-sm text-muted" title={album.artist}>
          {album.artist}
        </div>
        <div className="mt-1 flex gap-1.5 text-xs text-muted">
          {album.release_year && <span>{album.release_year}</span>}
          {album.genre && (
            <>
              {album.release_year && <span>·</span>}
              <span className="truncate">{album.genre}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
