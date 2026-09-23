import Link from "next/link";
import { CoverImage } from "@/components/CoverImage";
import { formatScore } from "@/lib/utils";
import type { Album } from "@/lib/types";

export type ContinueAlbum = {
  album: Album;
  score: number | null;
  ratedTracks: number;
  totalTracks: number;
  nextTrack: { id: string; name: string; order: number } | null;
};

export function ContinueRatingHero({ item }: { item: ContinueAlbum | null }) {
  const bg = item?.album.cover_colors?.bg ?? "#34302c";
  const text = item?.album.cover_colors?.text ?? "#ffffff";
  const accent = item?.album.cover_colors?.accent ?? "#df8a69";
  const progress = item ? Math.round((item.ratedTracks / item.totalTracks) * 100) : 0;
  const heroBackground = [
    `radial-gradient(circle at 84% 18%, color-mix(in srgb, ${accent} 32%, transparent) 0%, transparent 38%)`,
    `linear-gradient(135deg, ${bg} 0%, color-mix(in srgb, ${bg} 78%, #000000) 100%)`,
  ].join(", ");

  return (
    <section
      className="dashboard-hero relative overflow-hidden rounded-[1.75rem] px-5 py-6 shadow-[0_18px_55px_rgba(38,37,33,0.18)] sm:px-7 sm:py-7"
      style={{ background: heroBackground, color: text }}
    >
      <div
        aria-hidden="true"
        className="absolute -top-28 -right-20 size-80 rounded-full opacity-40"
        style={{
          backgroundImage: `repeating-radial-gradient(circle at center, transparent 0 20px, color-mix(in srgb, ${text} 13%, transparent) 21px 22px)`,
        }}
      />

      {item ? (
        <div className="relative grid items-center gap-6 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8">
          <div className="group mx-auto w-full max-w-44 sm:max-w-none">
            <CoverImage
              url={item.album.cover_image_url}
              alt={`${item.album.title} cover`}
              priority
              className="aspect-square w-full rounded-2xl shadow-[0_20px_45px_rgba(0,0,0,0.35)] transition-transform duration-500 group-hover:-rotate-1 group-hover:scale-[1.02] motion-reduce:transform-none"
            />
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <p className="text-xs font-semibold tracking-[0.15em] uppercase opacity-70">
              Continue your listen
            </p>
            <h1 className="mt-2 text-balance font-serif text-3xl leading-tight font-bold sm:text-4xl">
              {item.album.title}
            </h1>
            <p className="mt-1 text-base opacity-80">{item.album.artist}</p>

            <div className="mt-5 flex flex-wrap items-end justify-center gap-x-8 gap-y-3 sm:justify-start">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase opacity-60">
                  Progress
                </p>
                <p className="mt-0.5 text-sm font-medium">
                  {item.ratedTracks} of {item.totalTracks} tracks rated
                </p>
              </div>
              {item.score != null ? (
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.14em] uppercase opacity-60">
                    Current score
                  </p>
                  <p className="mt-0.5 font-serif text-2xl leading-none font-bold tabular-nums">
                    {formatScore(item.score)}
                  </p>
                </div>
              ) : null}
            </div>

            <div
              role="progressbar"
              aria-label={`${item.ratedTracks} of ${item.totalTracks} tracks rated`}
              aria-valuemin={0}
              aria-valuemax={item.totalTracks}
              aria-valuenow={item.ratedTracks}
              className="mt-3 h-1.5 overflow-hidden rounded-full"
              style={{ backgroundColor: `color-mix(in srgb, ${text} 18%, transparent)` }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${progress}%`, backgroundColor: accent }}
              />
            </div>

            {item.nextTrack ? (
              <p className="mt-3 truncate text-sm opacity-75">
                Next up · {item.nextTrack.order}. {item.nextTrack.name}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Link
                href={`/album/${item.album.id}${item.nextTrack ? `#track-${item.nextTrack.id}` : ""}`}
                className="btn border-0 px-5 shadow-sm"
                style={{ backgroundColor: text, color: bg }}
              >
                Continue rating
              </Link>
              <Link
                href="/album/new"
                className="btn border px-4 backdrop-blur-sm"
                style={{ borderColor: `color-mix(in srgb, ${text} 35%, transparent)`, color: text }}
              >
                Add another
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative max-w-2xl py-4 sm:py-8">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase opacity-65">
            Your listening journal
          </p>
          <h1 className="mt-2 text-balance font-serif text-3xl leading-tight font-bold sm:text-4xl">
            Start your next listen.
          </h1>
          <p className="mt-3 max-w-lg text-pretty opacity-75">
            Add an album to rate it track by track, or capture a standalone song
            while it is still playing in your head.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/album/new" className="btn bg-white px-5 text-[#34302c] hover:bg-white/90">
              Add an album
            </Link>
            <Link href="/songs" className="btn border border-white/30 text-white hover:bg-white/10">
              Rate a song
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
