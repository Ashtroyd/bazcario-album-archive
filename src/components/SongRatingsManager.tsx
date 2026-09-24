"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteSongRating,
  restoreSongRating,
  saveSongRating,
} from "@/app/actions/songs";
import { CoverImage } from "@/components/CoverImage";
import { IconChevronDown, IconChevronUp, IconTrash } from "@/components/icons";
import type { ReplayValue, SongWithMyRating } from "@/lib/types";

type SpotifySong = {
  id: string;
  title: string;
  artist: string;
  albumId: string;
  albumTitle: string;
  releaseDate: string | null;
  coverUrl: string | null;
  spotifyUrl: string;
  durationMs: number;
};

type EditableSong = {
  songId: string | null;
  spotifyTrackId: string;
  title: string;
  artist: string;
  albumTitle: string | null;
  coverUrl: string | null;
  spotifyUrl: string | null;
  rating: number | null;
  replayValue: ReplayValue | null;
  notes: string | null;
};

type RemovedSong = {
  song: EditableSong;
  index: number;
};

type RemovalNotice =
  | { kind: "removed"; removed: RemovedSong }
  | { kind: "restored"; title: string }
  | { kind: "error"; message: string };

const REPLAY_VALUES: ReplayValue[] = ["Low", "Medium", "High", "Very High"];

function fromRating(item: SongWithMyRating): EditableSong {
  return {
    songId: item.id,
    spotifyTrackId: item.spotify_track_id,
    title: item.title,
    artist: item.artist,
    albumTitle: item.album_title,
    coverUrl: item.cover_image_url,
    spotifyUrl: item.spotify_url,
    rating: Number(item.my_rating.rating),
    replayValue: item.my_rating.replay_value,
    notes: item.my_rating.notes,
  };
}

function fromSearch(item: SpotifySong): EditableSong {
  return {
    songId: null,
    spotifyTrackId: item.id,
    title: item.title,
    artist: item.artist,
    albumTitle: item.albumTitle,
    coverUrl: item.coverUrl,
    spotifyUrl: item.spotifyUrl,
    rating: null,
    replayValue: null,
    notes: null,
  };
}

function SongRatingEditor({
  song,
  isNew = false,
  onCancel,
  onRemove,
}: {
  song: EditableSong;
  isNew?: boolean;
  onCancel?: () => void;
  onRemove?: (song: EditableSong) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(song.rating == null ? "" : String(song.rating));
  const [replayValue, setReplayValue] = useState<ReplayValue | null>(song.replayValue);
  const [notes, setNotes] = useState(song.notes ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(isNew);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [pending, startTransition] = useTransition();
  const savedSnapshotRef = useRef({
    rating: song.rating == null ? "" : String(song.rating),
    replayValue: song.replayValue,
    notes: song.notes ?? "",
  });

  function save(overrides: Partial<{
    rating: string;
    replayValue: ReplayValue | null;
    notes: string;
  }> = {}) {
    const next = {
      rating: overrides.rating ?? rating,
      replayValue: Object.prototype.hasOwnProperty.call(overrides, "replayValue")
        ? overrides.replayValue ?? null
        : replayValue,
      notes: overrides.notes ?? notes,
    };
    const score = Number(next.rating);
    if (next.rating.trim() === "" || !Number.isFinite(score) || score < 0 || score > 10) {
      setMessage("Choose a score from 0 to 10.");
      return;
    }
    if (!isNew && JSON.stringify(next) === JSON.stringify(savedSnapshotRef.current)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await saveSongRating({
        spotifyTrackId: song.spotifyTrackId,
        rating: score,
        replayValue: next.replayValue,
        notes: next.notes || null,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      savedSnapshotRef.current = next;
      setMessage("Saved");
      if (isNew) onCancel?.();
      router.refresh();
    });
  }

  function remove() {
    if (!song.songId || !onRemove) return;
    setMessage(null);
    startTransition(async () => {
      const result = await onRemove(song);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setConfirmingRemove(false);
    });
  }

  return (
    <article className={`surface-item group p-3 transition-[box-shadow,background-color] sm:p-4 ${expanded ? "surface-selected" : ""}`}>
      <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[64px_minmax(0,1fr)_116px]">
        <CoverImage
          url={song.coverUrl}
          alt={`${song.title} artwork`}
          className="h-16 w-16 rounded-xl"
        />

        <div className="min-w-0">
          <h2 className="truncate font-serif text-lg font-semibold text-ink">{song.title}</h2>
          <p className="truncate text-sm text-body">{song.artist}</p>
          {song.albumTitle ? <p className="truncate text-xs text-muted">{song.albumTitle}</p> : null}
          {!expanded && (replayValue || notes) ? (
            <p className="mt-1 truncate text-xs text-muted">
              {[replayValue ? `${replayValue} replay` : null, notes || null].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="col-span-2 flex items-center rounded-xl bg-ivory px-3 py-2 sm:col-span-1 sm:flex-col sm:justify-center sm:px-3">
          <label htmlFor={`song-score-${song.spotifyTrackId}`} className="text-xs font-medium text-muted">
            Score
          </label>
          <input
            id={`song-score-${song.spotifyTrackId}`}
            name={`score-${song.spotifyTrackId}`}
            type="number"
            min="0"
            max="10"
            step="0.01"
            inputMode="decimal"
            autoComplete="off"
            value={rating}
            onChange={(event) => setRating(event.target.value)}
            onBlur={() => {
              if (!isNew) save();
            }}
            placeholder="—"
            className="mx-auto w-24 border-0 bg-transparent text-center font-serif text-3xl font-bold text-ink sm:w-full"
          />
          <span className="text-xs text-muted">out of 10</span>
        </div>
      </div>

      <div className="mt-3 flex min-h-9 flex-wrap items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={`song-details-${song.spotifyTrackId}`}
          className="btn btn-ghost -ml-2 min-h-11 px-2.5 py-1.5 text-xs sm:min-h-9"
        >
          {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          {expanded ? "Hide details" : replayValue || notes ? "Edit details" : "Add details"}
        </button>
        {song.spotifyUrl ? (
          <a
            href={song.spotifyUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center rounded-full px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-ivory hover:text-accent sm:min-h-9"
          >
            Open in Spotify ↗
          </a>
        ) : null}
        <span role="status" aria-live="polite" className={`ml-auto text-xs ${message && message !== "Saved" ? "text-accent" : "text-muted"}`}>
          {pending ? "Saving…" : message ?? (isNew ? "Not saved yet" : "Auto-saves")}
        </span>
        {isNew ? (
          <>
            <button type="button" onClick={() => save()} disabled={pending} className="btn btn-primary px-3 py-1.5">
              {pending ? "Saving…" : "Save rating"}
            </button>
            <button type="button" onClick={onCancel} disabled={pending} className="btn btn-ghost px-3 py-1.5">
              Cancel
            </button>
          </>
        ) : null}
      </div>

      {expanded ? (
        <div id={`song-details-${song.spotifyTrackId}`} className="animate-context-in">
          <div className="space-y-4 pt-4">
            <fieldset>
              <legend className="label">Replay value</legend>
              <div className="flex flex-wrap gap-1.5">
                {REPLAY_VALUES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={replayValue === value}
                    onClick={() => {
                      const next = replayValue === value ? null : value;
                      setReplayValue(next);
                      if (!isNew) save({ replayValue: next });
                    }}
                    className={`min-h-11 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:min-h-9 ${
                      replayValue === value
                        ? "bg-accent text-white"
                        : "bg-ivory text-muted hover:text-body"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="label">Listening note</span>
              <textarea
                name={`notes-${song.spotifyTrackId}`}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                onBlur={() => {
                  if (!isNew) save();
                }}
                maxLength={1000}
                rows={2}
                autoComplete="off"
                placeholder="A lyric, feeling, or moment…"
                className="input resize-y"
              />
            </label>

            {!isNew ? (
              <div className="flex min-h-9 items-center gap-2">
                {confirmingRemove ? (
                  <div
                    role="group"
                    aria-label={`Confirm removal of ${song.title}`}
                    className="song-remove-confirm flex flex-wrap items-center gap-1.5 rounded-lg border border-accent/25 bg-accent-soft px-2 py-1"
                  >
                    <span className="px-1 text-xs font-medium text-ink">Remove this rating?</span>
                    <button type="button" onClick={() => setConfirmingRemove(false)} disabled={pending} className="rounded-md px-2 py-1 text-xs font-medium text-body transition-colors hover:bg-surface">
                      Keep
                    </button>
                    <button type="button" onClick={remove} disabled={pending} className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white transition-[filter] hover:brightness-95 disabled:opacity-60">
                      {pending ? "Removing…" : "Remove"}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmingRemove(true)} disabled={pending} className="btn btn-danger -ml-3 px-3 py-1.5 text-xs">
                    <IconTrash size={15} /> Remove rating
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function SongRatingsManager({ ratings }: { ratings: SongWithMyRating[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifySong[]>([]);
  const [draft, setDraft] = useState<EditableSong | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hiddenSongIds, setHiddenSongIds] = useState<Set<string>>(() => new Set());
  const [restoredSongs, setRestoredSongs] = useState<RemovedSong[]>([]);
  const [notice, setNotice] = useState<RemovalNotice | null>(null);
  const [restoring, setRestoring] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    abortRef.current?.abort();
  }, []);

  function showNotice(next: RemovalNotice, duration = 6000) {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(next);
    noticeTimerRef.current = setTimeout(() => {
      setNotice(null);
      router.refresh();
    }, duration);
  }

  async function removeSong(song: EditableSong) {
    if (!song.songId) return { ok: false as const, error: "This song could not be removed." };

    const index = visibleSongs.findIndex((item) => item.songId === song.songId);
    const result = await deleteSongRating(song.songId);
    if (!result.ok) return result;

    setHiddenSongIds((current) => new Set(current).add(song.songId!));
    showNotice({ kind: "removed", removed: { song, index: Math.max(index, 0) } });
    return { ok: true as const };
  }

  async function undoRemoval(removed: RemovedSong) {
    const songId = removed.song.songId;
    if (!songId || restoring) return;

    setRestoring(true);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    const result = await restoreSongRating({
      songId,
      rating: removed.song.rating!,
      replayValue: removed.song.replayValue,
      notes: removed.song.notes,
    });
    setRestoring(false);

    if (!result.ok) {
      showNotice({ kind: "error", message: result.error }, 7000);
      return;
    }

    setHiddenSongIds((current) => {
      const next = new Set(current);
      next.delete(songId);
      return next;
    });
    setRestoredSongs((current) => [
      ...current.filter(({ song }) => song.songId !== songId),
      removed,
    ]);
    showNotice({ kind: "restored", title: removed.song.title }, 4000);
    router.refresh();
  }

  function search(value: string) {
    setQuery(value);
    setSearchError(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
    if (value.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setSearching(true);
      try {
        const response = await fetch(
          `/api/single-songs/search?q=${encodeURIComponent(value)}`,
          { signal: controller.signal },
        );
        const body = (await response.json()) as { results?: SpotifySong[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Search failed");
        setResults(body.results ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
          setSearchError("Could not search Spotify right now.");
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
  }

  function choose(song: SpotifySong) {
    setDraft(fromSearch(song));
    setQuery("");
    setResults([]);
    setSearchError(null);
  }

  const baseSongs = ratings.map(fromRating);
  const visibleSongs = [...baseSongs];
  for (const restored of restoredSongs) {
    if (restored.song.songId && visibleSongs.some((song) => song.songId === restored.song.songId)) continue;
    visibleSongs.splice(Math.min(restored.index, visibleSongs.length), 0, restored.song);
  }
  const displayedSongs = visibleSongs.filter((song) => !song.songId || !hiddenSongIds.has(song.songId));

  return (
    <div className="space-y-5">
      <div className="relative">
        <label htmlFor="single-song-search" className="label">Find a song on Spotify</label>
        <input
          id="single-song-search"
          value={query}
          onChange={(event) => search(event.target.value)}
          placeholder="Song or artist…"
          autoComplete="off"
          className="input pr-24"
        />
        <span className="pointer-events-none absolute top-9 right-3 text-xs text-muted">
          {searching ? "Searching…" : "Spotify"}
        </span>
        {results.length > 0 ? (
          <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-[0_16px_36px_rgba(38,37,33,0.18)]">
            {results.map((song) => (
              <li key={song.id}>
                <button
                  type="button"
                  onClick={() => choose(song)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-ivory focus-visible:bg-ivory"
                >
                  <CoverImage url={song.coverUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{song.title}</span>
                    <span className="block truncate text-xs text-muted">{song.artist} · {song.albumTitle}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {searchError ? <p role="status" className="mt-1 text-xs text-accent">{searchError}</p> : null}
      </div>

      {draft ? <SongRatingEditor key={draft.spotifyTrackId} song={draft} isNew onCancel={() => setDraft(null)} /> : null}

      {displayedSongs.length === 0 && !draft ? (
        <div className="card text-center text-sm text-muted">
          No standalone song ratings yet. Search above to score the first one.
        </div>
      ) : (
        <div className="space-y-3">
          {displayedSongs.map((song) => (
            <SongRatingEditor key={song.songId} song={song} onRemove={removeSong} />
          ))}
        </div>
      )}

      {notice ? (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="rating-save-toast fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 z-50 overflow-hidden rounded-xl border border-white/10 bg-ink text-paper shadow-[0_18px_55px_rgba(38,37,33,0.3)] sm:right-6 sm:bottom-6 sm:left-auto sm:w-96"
        >
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-accent/55 bg-accent/15 text-accent">
              <span className="size-2 rounded-full bg-current" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-paper/60 uppercase">
                {notice.kind === "removed" ? "Rating removed" : notice.kind === "restored" ? "Rating restored" : "Restore interrupted"}
              </p>
              <p className="truncate text-sm font-medium">
                {notice.kind === "removed" ? notice.removed.song.title : notice.kind === "restored" ? notice.title : notice.message}
              </p>
            </div>
            {notice.kind === "removed" ? (
              <button
                type="button"
                onClick={() => undoRemoval(notice.removed)}
                disabled={restoring}
                className="shrink-0 rounded-full border border-paper/25 px-3 py-1.5 text-xs font-semibold text-paper transition hover:border-paper/50 hover:bg-paper/10 disabled:opacity-60"
              >
                {restoring ? "Restoring…" : "Undo"}
              </button>
            ) : null}
          </div>
          {notice.kind === "removed" ? <div aria-hidden="true" className="rating-save-toast-timer h-0.5 origin-left bg-accent" /> : null}
        </div>
      ) : null}
    </div>
  );
}
