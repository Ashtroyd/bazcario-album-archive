import Link from "next/link";
import { cn } from "@/lib/utils";

export type AlbumScope = "mine" | "friends" | "all";

const SCOPES: { value: AlbumScope; label: string; shortLabel?: string }[] = [
  { value: "mine", label: "Mine" },
  { value: "friends", label: "Friends" },
  { value: "all", label: "All albums", shortLabel: "All" },
];

export function AlbumScopeTabs({
  active,
  counts,
  hrefs,
}: {
  active: AlbumScope;
  counts: Record<AlbumScope, number>;
  hrefs: Record<AlbumScope, string>;
}) {
  const selectedIndex = SCOPES.findIndex((scope) => scope.value === active);

  return (
    <nav
      aria-label="Album collection"
      className="relative grid w-full grid-cols-3 rounded-2xl bg-ivory p-1 sm:w-auto sm:min-w-md"
    >
      <span
        aria-hidden="true"
        className="album-scope-pill absolute inset-y-1 left-1 rounded-xl bg-ink shadow-[0_4px_12px_rgba(38,37,33,0.18)]"
        style={{
          width: "calc((100% - 0.5rem) / 3)",
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />
      {SCOPES.map((scope) => (
        <Link
          key={scope.value}
          href={hrefs[scope.value]}
          scroll={false}
          aria-current={active === scope.value ? "page" : undefined}
          aria-label={`${scope.label}, ${counts[scope.value]} albums`}
          className={cn(
            "relative z-10 flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
            active === scope.value ? "text-paper" : "text-muted hover:text-ink",
          )}
        >
          <span className={scope.shortLabel ? "sm:hidden" : undefined}>
            {scope.shortLabel ?? scope.label}
          </span>
          {scope.shortLabel ? (
            <span className="hidden sm:inline">{scope.label}</span>
          ) : null}
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums transition-colors",
              active === scope.value ? "bg-paper/15 text-paper" : "bg-ivory text-muted",
            )}
          >
            {counts[scope.value]}
          </span>
        </Link>
      ))}
    </nav>
  );
}
