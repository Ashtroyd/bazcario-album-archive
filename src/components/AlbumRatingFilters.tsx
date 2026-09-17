import Link from "next/link";
import { cn } from "@/lib/utils";

export type AlbumRatingFilter = "any" | "mine" | "unrated" | "friends";

const FILTERS: { value: AlbumRatingFilter; label: string }[] = [
  { value: "any", label: "Any rating" },
  { value: "mine", label: "Rated by me" },
  { value: "unrated", label: "Unrated by me" },
  { value: "friends", label: "Rated by friends" },
];

export function AlbumRatingFilters({
  active,
  counts,
  hrefs,
}: {
  active: AlbumRatingFilter;
  counts: Record<AlbumRatingFilter, number>;
  hrefs: Record<AlbumRatingFilter, string>;
}) {
  return (
    <nav
      aria-label="Filter albums by rating status"
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <span className="shrink-0 text-[10px] font-medium tracking-[0.14em] text-muted uppercase">
        Rating status
      </span>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1 shadow-[0_1px_2px_rgba(38,37,33,0.05)] sm:flex sm:flex-wrap">
        {FILTERS.map((filter) => {
          const selected = active === filter.value;

          return (
            <Link
              key={filter.value}
              href={hrefs[filter.value]}
              scroll={false}
              aria-current={selected ? "page" : undefined}
              aria-label={`${filter.label}, ${counts[filter.value]} albums`}
              className={cn(
                "flex min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition duration-200 motion-reduce:transform-none sm:justify-center",
                selected
                  ? "bg-accent text-white shadow-[0_3px_10px_rgba(193,88,55,0.22)]"
                  : "text-muted hover:-translate-y-px hover:bg-ivory hover:text-ink",
              )}
            >
              <span className="truncate">{filter.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums transition-colors",
                  selected ? "bg-white/15 text-white" : "bg-ivory text-muted",
                )}
              >
                {counts[filter.value]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
