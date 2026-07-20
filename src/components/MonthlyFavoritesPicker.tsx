"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import {
  moveMonthlyFavorite,
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

type Action =
  | { type: "swap"; a: number; b: number }
  | { type: "relocate"; id: string; target: number }
  | { type: "remove"; id: string }
  | { type: "add"; position: number; pick: MonthlyFavorite };

function reducer(state: MonthlyFavorite[], action: Action): MonthlyFavorite[] {
  switch (action.type) {
    case "swap":
      return state.map((p) => {
        if (p.position === action.a) return { ...p, position: action.b };
        if (p.position === action.b) return { ...p, position: action.a };
        return p;
      });
    case "relocate":
      return state.map((p) =>
        p.id === action.id ? { ...p, position: action.target } : p,
      );
    case "remove":
      return state.filter((p) => p.id !== action.id);
    case "add":
      return [
        ...state.filter((p) => p.position !== action.position),
        action.pick,
      ];
  }
}

export function MonthlyFavoritesPicker({
  month,
  picks,
}: {
  month: string;
  picks: MonthlyFavorite[];
}) {
  const [optimisticPicks, applyOptimistic] = useOptimistic(picks, reducer);
  const [, startTransition] = useTransition();
  const byPosition = new Map(optimisticPicks.map((p) => [p.position, p]));

  function move(pick: MonthlyFavorite, dir: 1 | -1) {
    const target = pick.position + dir;
    if (target < 1 || target > 5) return;
    const other = byPosition.get(target);

    startTransition(async () => {
      if (other) {
        applyOptimistic({ type: "swap", a: pick.position, b: target });
        const fd = new FormData();
        fd.set("month", month);
        fd.set("row_a_id", pick.id);
        fd.set("row_b_id", other.id);
        fd.set("position", String(pick.position));
        fd.set("target", String(target));
        fd.set("title", pick.title);
        fd.set("artist", pick.artist);
        fd.set("cover_url", pick.cover_url ?? "");
        fd.set("external_id", pick.external_id ?? "");
        await swapMonthlyFavoritePosition(fd);
      } else {
        applyOptimistic({ type: "relocate", id: pick.id, target });
        const fd = new FormData();
        fd.set("id", pick.id);
        fd.set("month", month);
        fd.set("target", String(target));
        await moveMonthlyFavorite(fd);
      }
    });
  }

  function remove(pick: MonthlyFavorite) {
    startTransition(async () => {
      applyOptimistic({ type: "remove", id: pick.id });
      const fd = new FormData();
      fd.set("id", pick.id);
      fd.set("month", month);
      await removeMonthlyFavorite(fd);
    });
  }

  function add(position: number, s: Suggestion) {
    startTransition(async () => {
      applyOptimistic({
        type: "add",
        position,
        pick: {
          id: `temp-${s.id}-${Date.now()}`,
          user_id: "",
          month,
          position,
          title: s.title,
          artist: s.artist,
          cover_url: s.coverUrl,
          external_id: String(s.id),
        },
      });
      const fd = new FormData();
      fd.set("month", month);
      fd.set("position", String(position));
      fd.set("title", s.title);
      fd.set("artist", s.artist);
      fd.set("cover_url", s.coverUrl ?? "");
      fd.set("external_id", String(s.id));
      await setMonthlyFavorite(fd);
    });
  }

  return (
    <div className="space-y-2">
      {SLOTS.map((pos) => {
        const pick = byPosition.get(pos);
        return pick ? (
          <FilledSlot
            key={pos}
            pick={pick}
            onMoveUp={() => move(pick, -1)}
            onMoveDown={() => move(pick, 1)}
            onRemove={() => remove(pick)}
          />
        ) : (
          <EmptySlot
            key={pos}
            position={pos}
            onPick={(s) => add(pos, s)}
          />
        );
      })}
    </div>
  );
}

function FilledSlot({
  pick,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  pick: MonthlyFavorite;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5 shadow-[0_1px_2px_rgba(38,37,33,0.06)] transition">
      <span className="w-5 shrink-0 text-center text-sm font-semibold text-muted">
        {pick.position}
      </span>
      <CoverImage
        url={pick.cover_url}
        alt=""
        className="h-12 w-12 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-ink">{pick.title}</div>
        <div className="truncate text-sm text-muted">{pick.artist}</div>
      </div>
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          disabled={pick.position === 1}
          onClick={onMoveUp}
          aria-label="Move up"
          className="rounded p-0.5 text-muted transition hover:text-ink disabled:opacity-20"
        >
          <IconChevronUp size={16} />
        </button>
        <button
          type="button"
          disabled={pick.position === 5}
          onClick={onMoveDown}
          aria-label="Move down"
          className="rounded p-0.5 text-muted transition hover:text-ink disabled:opacity-20"
        >
          <IconChevronDown size={16} />
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="shrink-0 rounded p-1.5 text-muted transition hover:bg-accent-soft hover:text-accent"
      >
        <IconTrash size={16} />
      </button>
    </div>
  );
}

function EmptySlot({
  position,
  onPick,
}: {
  position: number;
  onPick: (s: Suggestion) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
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

  function pick(s: Suggestion) {
    onPick(s);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line-strong p-2.5 text-left text-muted transition hover:border-accent hover:text-body"
      >
        <span className="w-5 shrink-0 text-center text-sm font-semibold">
          {position}
        </span>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong">
          <IconPlus size={18} />
        </span>
        <span className="text-sm">Add a song</span>
      </button>
    );
  }

  return (
    <div className="relative rounded-xl border border-line-strong bg-surface p-2.5">
      <div className="flex items-center gap-3">
        <span className="w-5 shrink-0 text-center text-sm font-semibold text-muted">
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
          <span className="shrink-0 animate-pulse text-xs text-muted">
            …
          </span>
        )}
      </div>

      {results.length > 0 && (
        <ul className="mt-2 max-h-72 overflow-auto rounded-lg border border-line bg-surface">
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-ivory"
              >
                <CoverImage
                  url={s.coverUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {s.title}
                  </span>
                  <span className="block truncate text-xs text-muted">
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
