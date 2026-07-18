import { CoverImage } from "@/components/CoverImage";
import type { MonthlyFavorite } from "@/lib/monthlyFavorites";

/** Compact read-only cover-strip view of someone's monthly picks. */
export function MonthlyFavoritesCard({ picks }: { picks: MonthlyFavorite[] }) {
  if (picks.length === 0) return null;
  return (
    <ol className="flex gap-3 overflow-x-auto pb-1">
      {picks.map((p) => (
        <li key={p.id} className="w-20 shrink-0 text-center">
          <div className="relative">
            <CoverImage
              url={p.cover_url}
              alt=""
              className="aspect-square w-20 rounded-lg"
            />
            <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
              {p.position}
            </span>
          </div>
          <div className="mt-1 truncate text-xs font-medium" title={p.title}>
            {p.title}
          </div>
          <div className="truncate text-[11px] text-zinc-500" title={p.artist}>
            {p.artist}
          </div>
        </li>
      ))}
    </ol>
  );
}
