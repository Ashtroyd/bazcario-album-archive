"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const selectCls =
  "rounded-xl border border-line bg-paper px-2 py-2 text-sm text-body outline-none transition-colors focus:border-line-strong";

export function LibraryFilters({
  genres,
  years,
}: {
  genres: string[];
  years: number[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function set(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/albums?${next.toString()}`);
  }

  function onSearch(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => set("q", value), 300);
  }

  const hasFilters = ["q", "genre", "year", "sort"].some((k) => sp.get(k));

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <input
        defaultValue={sp.get("q") ?? ""}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search title or artist…"
        className="input sm:max-w-xs sm:flex-1"
      />
      <div className="flex items-center gap-2">
        <select
          defaultValue={sp.get("genre") ?? ""}
          onChange={(e) => set("genre", e.target.value)}
          className={cn(selectCls, "min-w-0 flex-1 sm:flex-none")}
          aria-label="Filter by genre"
        >
          <option value="">All genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          defaultValue={sp.get("year") ?? ""}
          onChange={(e) => set("year", e.target.value)}
          className={cn(selectCls, "min-w-0 flex-1 sm:flex-none")}
          aria-label="Filter by year"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
        <select
          defaultValue={sp.get("sort") ?? "recent"}
          onChange={(e) => set("sort", e.target.value)}
          className={cn(selectCls, "min-w-0 flex-1 sm:flex-none")}
          aria-label="Sort"
        >
          <option value="recent">Newest</option>
          <option value="score">Your score</option>
          <option value="title">Title</option>
          <option value="year">Year</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => router.push("/albums")}
            className="btn btn-ghost px-2 py-1.5 text-sm"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
