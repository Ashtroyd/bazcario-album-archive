"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveSongRating,
} from "@/app/actions/songs";
import { CoverImage } from "@/components/CoverImage";
import { IconChevronDown, IconChevronUp, IconTrash } from "@/components/icons";
import type { ReplayValue } from "@/lib/types";

import {
  REPLAY_VALUES,
  type EditableSong,
} from "./types";

export function SongRatingEditor({
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
