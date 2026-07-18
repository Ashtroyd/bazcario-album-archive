"use client";

import { useRef, useState } from "react";
import {
  removeMonthlyFavorite,
  setMonthlyFavorite,
  swapMonthlyFavoritePosition,
} from "@/app/actions/monthlyFavorites";
import { CoverImage } from "@/components/CoverImage";
import {
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconTrash,
} from "@/components/icons";
import type { MonthlyFavorite } from "@/lib/monthlyFavorites";

type Suggestion = {
  id: number;
  title: string;
  artist: string;
  album: string | null;
  coverUrl: string | null;
};

const SLOTS = [1, 2, 3, 4, 5];

export function MonthlyFavoritesPicker({
  month,
  picks,
}: {
  month: string;
  picks: MonthlyFavorite[];
}) {
  const byPosition = new Map(picks.map((p) => [p.position, p]));

  return (
    <div className="space-y-2">
      {SLOTS.map((pos) => {
        const pick = byPosition.get(pos);
        return pick ? (
          <FilledSlot key={pos} month={month} pick={pick} />
        ) : (
          <EmptySlot key={pos} month={month} position={pos} />
        );
      })}
    </div>
  );
}

function FilledSlot({
  month,
  pick,
}: {
  month: string;
  pick: MonthlyFavorite;
}) {
  const [pending, setPending] = useState(false);

  async function move(dir: 1 | -1) {
    const target = pick.position + dir;
    if (target < 1 || target > 5) return;
    setPending(true);
    const fd = new FormData();
    fd.set("month", month);
    fd.set("position", String(pick.position));
    fd.set("target", String(target));
    await swapMonthlyFavoritePosition(fd);
    setPending(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-2.5">
      <span className="w-5 shrink-0 text-center text-sm font-semibold text-zinc-500">
        {pick.position}
      </span>
      <CoverImage
        url={pick.cover_url}
        alt=""
        className="h-12 w-12 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{pick.title}</div>
        <div className="truncate text-sm text-zinc-400">{pick.artist}</div>
      </div>
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          disabled={pending || pick.position === 1}
          onClick={() => move(-1)}
          aria-label="Move up"
          className="rounded p-0.5 text-zinc-500 transition hover:text-white disabled:opacity-20"
        >
          <IconChevronUp size={16} />
        </button>
        <button
          type="button"
          disabled={pending || pick.position === 5}
          onClick={() => move(1)}
          aria-label="Move down"
          className="rounded p-0.5 text-zinc-500 transition hover:text-white disabled:opacity-20"
        >
          <IconChevronDown size={16} />
        </button>
      </div>
      <form action={removeMonthlyFavorite}>
        <input type="hidden" name="id" value={pick.id} />
        <input type="hidden" name="month" value={month} />
        <button
          type="submit"
          aria-label="Remove"
          className="shrink-0 rounded p-1.5 text-zinc-500 transition hover:bg-red-950/40 hover:text-red-400"
        >
          <IconTrash size={16} />
        </button>
      </form>
    </div>
  );
}

function EmptySlot({ month, position }: { month: string; position: number }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [picking, setPicking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(v: string) {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/songs/search?q=${encodeURIComponent(v)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function pick(s: Suggestion) {
    setPicking(true);
    const fd = new FormData();
    fd.set("month", month);
    fd.set("position", String(position));
    fd.set("title", s.title);
    fd.set("artist", s.artist);
    fd.set("cover_url", s.coverUrl ?? "");
    fd.set("external_id", String(s.id));
    await setMonthlyFavorite(fd);
    setPicking(false);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-zinc-700 p-2.5 text-left text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300"
      >
        <span className="w-5 shrink-0 text-center text-sm font-semibold">
          {position}
        </span>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-700">
          <IconPlus size={18} />
        </span>
        <span className="text-sm">Add a song</span>
      </button>
    );
  }

  return (
    <div className="relative rounded-xl border border-zinc-700 bg-zinc-900/60 p-2.5">
      <div className="flex items-center gap-3">
        <span className="w-5 shrink-0 text-center text-sm font-semibold text-zinc-500">
          {position}
        </span>
        <input
          autoFocus
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search for a song…"
          autoComplete="off"
          className="input"
        />
        {searching && (
          <span className="shrink-0 animate-pulse text-xs text-zinc-500">
            …
          </span>
        )}
      </div>

      {results.length > 0 && (
        <ul className="mt-2 max-h-72 overflow-auto rounded-lg border border-zinc-700 bg-zinc-900">
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                disabled={picking}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-zinc-800"
              >
                <CoverImage
                  url={s.coverUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {s.title}
                  </span>
                  <span className="block truncate text-xs text-zinc-400">
                    {s.artist}
                    {s.album ? ` · ${s.album}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
