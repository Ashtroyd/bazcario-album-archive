import Link from "next/link";
import { CoverImage } from "@/components/CoverImage";
import { formatScore } from "@/lib/utils";

export type DashboardRecentItem = {
  id: string;
  kind: "Album" | "Song";
  href: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  score: number | null;
  updatedAt: string;
};

export function DashboardRecentRatings({ items }: { items: DashboardRecentItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-5">
      {items.map((item, index) => (
        <Link
          key={`${item.kind}-${item.id}`}
          href={item.href}
          aria-label={`${item.kind}: ${item.title} by ${item.artist}${item.score == null ? "" : `, score ${formatScore(item.score)}`}`}
          className="list-in group min-w-0"
          style={{ animationDelay: `${index * 45}ms` }}
        >
          <div className="relative overflow-hidden rounded-2xl bg-ivory shadow-[0_5px_18px_rgba(38,37,33,0.13)] transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_14px_30px_rgba(38,37,33,0.2)] motion-reduce:transform-none">
            <CoverImage
              url={item.coverUrl}
              alt=""
              className="aspect-square w-full transition-transform duration-500 group-hover:scale-[1.035] motion-reduce:transform-none"
            />
            <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold tracking-wide text-white uppercase backdrop-blur-md">
              {item.kind}
            </span>
            {item.score != null ? (
              <span className="absolute right-2 bottom-2 rounded-full bg-paper/90 px-2.5 py-1 font-serif text-lg leading-none font-bold tabular-nums text-ink shadow-sm backdrop-blur-md">
                {formatScore(item.score)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-ink">{item.title}</p>
          <p className="truncate text-xs text-muted">{item.artist}</p>
        </Link>
      ))}
    </div>
  );
}
