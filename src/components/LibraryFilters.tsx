"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { AlbumRatingFilter } from "@/components/AlbumRatingFilters";
import type { AlbumScope } from "@/components/AlbumScopeTabs";
import { IconSearch, IconSliders, IconX } from "@/components/icons";
import { cn } from "@/lib/utils";

type LibraryQuery = {
  q?: string;
  genre?: string;
  year?: string;
  sort?: string;
  rating?: string;
};

const RATING_OPTIONS: { value: AlbumRatingFilter; label: string }[] = [
  { value: "any", label: "Any rating" },
  { value: "mine", label: "Rated by me" },
  { value: "unrated", label: "Unrated by me" },
  { value: "friends", label: "Rated by friends" },
];

const selectClass = "input appearance-auto bg-surface text-base sm:text-sm";

export function LibraryFilters({
  genres,
  years,
  scope,
  current,
  ratingCounts,
}: {
  genres: string[];
  years: number[];
  scope: AlbumScope;
  current: LibraryQuery;
  ratingCounts: Record<AlbumRatingFilter, number>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const rating = (current.rating ?? "any") as AlbumRatingFilter;
  const sort = current.sort ?? "recent";
  const activeFilterCount =
    Number(rating !== "any") +
    Number(Boolean(current.genre)) +
    Number(Boolean(current.year)) +
    Number(sort !== "recent");

  function hrefWithout(key: keyof LibraryQuery) {
    const params = new URLSearchParams();
    if (scope !== "mine") params.set("scope", scope);
    for (const [name, value] of Object.entries(current)) {
      if (name !== key && value && !(name === "sort" && value === "recent")) {
        params.set(name, value);
      }
    }
    const query = params.toString();
    return query ? `/albums?${query}` : "/albums";
  }

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (
        window.matchMedia("(min-width: 640px)").matches &&
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    const previousOverflow = document.body.style.overflow;
    const triggerButton = triggerRef.current;
    if (isMobile) document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      if (isMobile) document.body.style.overflow = previousOverflow;
      triggerButton?.focus();
    };
  }, [open]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    if (scope !== "mine") params.set("scope", scope);
    const query = String(form.get("q") ?? "").trim();
    if (query) params.set("q", query);
    if (rating !== "any") params.set("rating", rating);
    if (current.genre) params.set("genre", current.genre);
    if (current.year) params.set("year", current.year);
    if (sort !== "recent") params.set("sort", sort);
    router.push(params.size ? `/albums?${params}` : "/albums");
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    if (scope !== "mine") params.set("scope", scope);
    if (current.q) params.set("q", current.q);
    for (const key of ["rating", "genre", "year", "sort"] as const) {
      const value = String(form.get(key) ?? "");
      if (value && value !== "any" && !(key === "sort" && value === "recent")) {
        params.set(key, value);
      }
    }
    setOpen(false);
    router.push(params.size ? `/albums?${params}` : "/albums");
  }

  const chips = [
    current.q ? { key: "q" as const, label: `Search: “${current.q}”` } : null,
    rating !== "any"
      ? {
          key: "rating" as const,
          label: RATING_OPTIONS.find((option) => option.value === rating)?.label ?? rating,
        }
      : null,
    current.genre ? { key: "genre" as const, label: current.genre } : null,
    current.year ? { key: "year" as const, label: current.year } : null,
    sort !== "recent"
      ? {
          key: "sort" as const,
          label:
            sort === "score"
              ? scope === "friends"
                ? "Friend score"
                : "Your score"
              : sort === "title"
                ? "Title A–Z"
                : "Release year",
        }
      : null,
  ].filter((chip): chip is NonNullable<typeof chip> => chip !== null);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <form onSubmit={submitSearch} role="search" className="relative min-w-0 flex-1">
          <IconSearch
            size={18}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
          />
          <input
            key={current.q ?? ""}
            name="q"
            defaultValue={current.q ?? ""}
            aria-label="Search albums by title or artist"
            placeholder="Search albums or artists…"
            autoComplete="off"
            className="input h-12 rounded-2xl bg-surface pr-12 pl-10 shadow-[0_1px_2px_rgba(38,37,33,0.04)]"
          />
          <button
            type="submit"
            className="absolute top-1/2 right-1.5 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted transition-colors hover:bg-ivory hover:text-ink"
            aria-label="Search"
          >
            <span aria-hidden="true" className="text-lg leading-none">→</span>
          </button>
        </form>

        <div ref={wrapperRef} className="relative shrink-0">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="album-library-filters"
            className={cn(
              "flex h-12 items-center gap-2 rounded-2xl border px-3.5 text-sm font-medium shadow-[0_1px_2px_rgba(38,37,33,0.04)] transition-colors sm:px-4",
              open || activeFilterCount
                ? "border-line-strong bg-ink text-paper"
                : "border-line bg-surface text-body hover:border-line-strong hover:text-ink",
            )}
          >
            <IconSliders size={17} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] text-white tabular-nums">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          {open ? (
            <>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-40 bg-ink/35 backdrop-blur-[2px] sm:hidden"
              />
              <div
                id="album-library-filters"
                role="dialog"
                aria-label="Album filters"
                className="library-filter-panel fixed right-0 bottom-0 left-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-[1.75rem] border border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-18px_60px_rgba(38,37,33,0.2)] sm:absolute sm:top-[calc(100%+0.6rem)] sm:right-0 sm:bottom-auto sm:left-auto sm:z-30 sm:max-h-none sm:w-[23rem] sm:rounded-2xl sm:p-5 sm:shadow-[0_18px_55px_rgba(38,37,33,0.16)]"
              >
                <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line-strong sm:hidden" />
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-ink">Refine albums</h2>
                    <p className="mt-0.5 text-xs text-muted">Narrow the library without losing your place.</p>
                  </div>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ivory text-muted transition-colors hover:text-ink"
                    aria-label="Close filters"
                  >
                    <IconX size={16} />
                  </button>
                </div>

                <form onSubmit={applyFilters} className="space-y-5">
                  <fieldset>
                    <legend className="label mb-2">Rating status</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {RATING_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-body transition-colors"
                        >
                          <input
                            type="radio"
                            name="rating"
                            value={option.value}
                            defaultChecked={rating === option.value}
                            className="sr-only"
                          />
                          <span className="truncate">{option.label}</span>
                          <span className="text-xs opacity-65 tabular-nums">
                            {ratingCounts[option.value]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <span className="label">Genre</span>
                      <select name="genre" defaultValue={current.genre ?? ""} className={selectClass}>
                        <option value="">All genres</option>
                        {genres.map((genre) => (
                          <option key={genre} value={genre}>{genre}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="label">Year</span>
                      <select name="year" defaultValue={current.year ?? ""} className={selectClass}>
                        <option value="">All years</option>
                        {years.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label>
                    <span className="label">Sort by</span>
                    <select name="sort" defaultValue={sort} className={selectClass}>
                      <option value="recent">Newest added</option>
                      <option value="score">{scope === "friends" ? "Friend score" : "Your score"}</option>
                      <option value="title">Title A–Z</option>
                      <option value="year">Release year</option>
                    </select>
                  </label>

                  <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                    <Link
                      href={scope === "mine" ? "/albums" : `/albums?scope=${scope}`}
                      onClick={() => setOpen(false)}
                      className="btn btn-ghost -ml-3"
                    >
                      Clear all
                    </Link>
                    <button type="submit" className="btn btn-primary px-5">
                      Apply Filters
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Applied filters">
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={hrefWithout(chip.key)}
              scroll={false}
              className="group inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs text-body transition-colors hover:border-line-strong hover:text-ink"
            >
              <span className="truncate">{chip.label}</span>
              <IconX size={13} className="shrink-0 text-muted group-hover:text-ink" />
              <span className="sr-only">Remove filter</span>
            </Link>
          ))}
          {chips.length > 1 ? (
            <Link
              href={scope === "mine" ? "/albums" : `/albums?scope=${scope}`}
              scroll={false}
              className="px-1 text-xs font-medium text-muted hover:text-ink"
            >
              Clear all
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
