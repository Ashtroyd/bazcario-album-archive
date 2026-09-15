"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSongRating, saveSongRating } from "@/app/actions/songs";
import { CoverImage } from "@/components/CoverImage";
import { IconTrash } from "@/components/icons";
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
}: {
  song: EditableSong;
  isNew?: boolean;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(song.rating == null ? "" : String(song.rating));
  const [replayValue, setReplayValue] = useState<ReplayValue | null>(song.replayValue);
  const [notes, setNotes] = useState(song.notes ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    const score = Number(rating);
    if (rating.trim() === "" || !Number.isFinite(score) || score < 0 || score > 10) {
      setMessage("Choose a score from 0 to 10.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await saveSongRating({
        spotifyTrackId: song.spotifyTrackId,
        rating: score,
        replayValue,
        notes: notes || null,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("Saved");
      if (isNew) onCancel?.();
      router.refresh();
    });
  }

  function remove() {
    const songId = song.songId;
    if (!songId) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteSongRating(songId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <article className="group grid gap-4 rounded-2xl border border-line bg-surface p-3 shadow-[0_2px_12px_rgba(38,37,33,0.05)] sm:grid-cols-[88px_minmax(0,1fr)_112px] sm:p-4">
      <CoverImage
        url={song.coverUrl}
        alt={`${song.title} artwork`}
        className="aspect-square w-full rounded-xl sm:w-[88px]"
      />

      <div className="min-w-0 space-y-3">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate font-serif text-lg font-semibold text-ink">{song.title}</h2>
              <p className="truncate text-sm text-body">{song.artist}</p>
              {song.albumTitle ? (
                <p className="truncate text-xs text-muted">{song.albumTitle}</p>
              ) : null}
            </div>
            {song.spotifyUrl ? (
              <a
                href={song.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs text-muted transition hover:text-accent"
              >
                Spotify ↗
              </a>
            ) : null}
          </div>
        </div>

        <fieldset>
          <legend className="label">Replay value</legend>
          <div className="flex flex-wrap gap-1.5">
            {REPLAY_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={replayValue === value}
                onClick={() => setReplayValue(replayValue === value ? null : value)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  replayValue === value
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-muted hover:border-line-strong hover:text-body"
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
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="What makes this song stick?"
            className="input resize-y"
          />
        </label>

        <div className="flex min-h-8 items-center gap-2">
          <button type="button" onClick={save} disabled={pending} className="btn btn-primary px-3 py-1.5">
            {pending ? "Saving…" : "Save rating"}
          </button>
          {isNew ? (
            <button type="button" onClick={onCancel} disabled={pending} className="btn btn-ghost px-3 py-1.5">
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              aria-label={`Remove rating for ${song.title}`}
              className="rounded-lg p-2 text-muted transition hover:bg-accent-soft hover:text-accent"
            >
              <IconTrash size={16} />
            </button>
          )}
          {message ? (
            <span role="status" className={message === "Saved" ? "text-xs text-body" : "text-xs text-accent"}>
              {message}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-ivory px-4 py-3 sm:flex-col sm:justify-center sm:gap-1">
        <label htmlFor={`song-score-${song.spotifyTrackId}`} className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
          Score
        </label>
        <input
          id={`song-score-${song.spotifyTrackId}`}
          type="number"
          min="0"
          max="10"
          step="0.01"
          value={rating}
          onChange={(event) => setRating(event.target.value)}
          placeholder="—"
          className="w-24 border-0 bg-transparent text-center font-serif text-4xl font-bold text-ink outline-none sm:w-full"
        />
        <span className="text-xs text-muted">out of 10</span>
      </div>
    </article>
  );
}

export function SongRatingsManager({ ratings }: { ratings: SongWithMyRating[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifySong[]>([]);
  const [draft, setDraft] = useState<EditableSong | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }, []);

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

      {ratings.length === 0 && !draft ? (
        <div className="card text-center text-sm text-muted">
          No standalone song ratings yet. Search above to score the first one.
        </div>
      ) : (
        <div className="space-y-3">
          {ratings.map((item) => (
            <SongRatingEditor key={item.id} song={fromRating(item)} />
          ))}
        </div>
      )}
    </div>
  );
}
