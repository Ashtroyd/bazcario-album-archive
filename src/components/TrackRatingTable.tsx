"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveTrackRating } from "@/app/actions/ratings";
import { Avatar } from "@/components/Avatar";
import { normalizeRatingInput } from "@/lib/ratingInput";
import { REPLAY_VALUES, type ReplayValue } from "@/lib/types";
import { cn, formatScore, scoreColor } from "@/lib/utils";

type FriendScore = { name: string | null; avatar: string | null; score: number };

type Row = {
  id: string;
  name: string;
  order: number;
  rating: number | null;
  replay: ReplayValue | null;
  notes: string | null;
  friends: FriendScore[];
};

type RatingSnapshot = {
  rating: string;
  replay: ReplayValue | "";
  notes: string;
};

type SaveNotice =
  | { kind: "saved"; trackName: string; undo: () => void }
  | { kind: "undone"; trackName: string }
  | { kind: "error"; trackName: string; message: string };

type Toast = SaveNotice & { id: number };

const SHORT: Record<ReplayValue, string> = {
  Low: "Low",
  Medium: "Med",
  High: "High",
  "Very High": "V.High",
};

export function TrackRatingTable({
  albumId,
  tracks,
}: {
  albumId: string;
  tracks: Row[];
}) {
  const [toast, setToast] = useState<Toast | null>(null);
  const toastIdRef = useRef(0);
  const toastTimerRef = useRef<number | null>(null);

  const showNotice = useCallback((notice: SaveNotice) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    const id = ++toastIdRef.current;
    setToast({ ...notice, id });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, notice.kind === "error" ? 7000 : 6000);
  }, []);

  const dismissNotice = useCallback(() => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  return (
    <>
      <div className="space-y-2">
        {tracks.map((t) => (
          <TrackRow
            key={t.id}
            albumId={albumId}
            track={t}
            onNotice={showNotice}
            onSaveStart={dismissNotice}
          />
        ))}
      </div>

      {toast ? (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="rating-save-toast fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 z-50 overflow-hidden rounded-xl border border-white/10 bg-ink text-paper shadow-[0_18px_55px_rgba(38,37,33,0.3)] sm:right-6 sm:bottom-6 sm:left-auto sm:w-96"
        >
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span
              aria-hidden="true"
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full border",
                toast.kind === "error"
                  ? "border-accent/60 bg-accent/15 text-accent"
                  : "border-sage/60 bg-sage/15 text-sage",
              )}
            >
              <span className="size-2 rounded-full bg-current" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-paper/60 uppercase">
                {toast.kind === "saved"
                  ? "Track updated"
                  : toast.kind === "undone"
                    ? "Change undone"
                    : "Save interrupted"}
              </p>
              <p className="truncate text-sm font-medium">
                {toast.kind === "error" ? toast.message : toast.trackName}
              </p>
            </div>
            {toast.kind === "saved" ? (
              <button
                type="button"
                onClick={() => {
                  const undo = toast.undo;
                  setToast(null);
                  if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                  undo();
                }}
                className="shrink-0 rounded-full border border-paper/25 px-3 py-1.5 text-xs font-semibold text-paper transition hover:border-paper/50 hover:bg-paper/10"
              >
                Undo
              </button>
            ) : null}
          </div>
          {toast.kind !== "error" ? <div aria-hidden="true" className="rating-save-toast-timer h-0.5 origin-left bg-accent" /> : null}
        </div>
      ) : null}
    </>
  );
}

function snapshotsMatch(a: RatingSnapshot, b: RatingSnapshot): boolean {
  return a.rating === b.rating && a.replay === b.replay && a.notes === b.notes;
}

function TrackRow({
  albumId,
  track,
  onNotice,
  onSaveStart,
}: {
  albumId: string;
  track: Row;
  onNotice: (notice: SaveNotice) => void;
  onSaveStart: () => void;
}) {
  const [rating, setRating] = useState(
    track.rating != null ? String(track.rating) : "",
  );
  const [replay, setReplay] = useState<ReplayValue | "">(track.replay ?? "");
  const [notes, setNotes] = useState(track.notes ?? "");
  const [pendingSaves, setPendingSaves] = useState(0);
  const initialSnapshotRef = useRef<RatingSnapshot>({
    rating: track.rating != null ? String(track.rating) : "",
    replay: track.replay ?? "",
    notes: track.notes ?? "",
  });
  const latestTargetRef = useRef(initialSnapshotRef.current);
  const confirmedSnapshotRef = useRef(initialSnapshotRef.current);
  const saveQueueRef = useRef(Promise.resolve());
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function applySnapshot(snapshot: RatingSnapshot) {
    setRating(snapshot.rating);
    setReplay(snapshot.replay);
    setNotes(snapshot.notes);
  }

  function formDataFor(snapshot: RatingSnapshot): FormData {
    const fd = new FormData();
    fd.set("track_id", track.id);
    fd.set("album_id", albumId);
    fd.set("rating", snapshot.rating);
    fd.set("replay_value", snapshot.replay);
    fd.set("notes", snapshot.notes);
    return fd;
  }

  function enqueueSave(
    snapshot: RatingSnapshot,
    options: { offerUndo: boolean },
  ) {
    const previous = latestTargetRef.current;
    if (snapshotsMatch(snapshot, previous)) return;

    onSaveStart();
    latestTargetRef.current = snapshot;
    const requestId = ++requestIdRef.current;
    setPendingSaves((count) => count + 1);

    saveQueueRef.current = saveQueueRef.current.then(async () => {
      try {
        const result = await saveTrackRating(formDataFor(snapshot));
        if (!mountedRef.current) return;

        if (!result.ok) {
          if (requestId !== requestIdRef.current) return;
          const confirmed = confirmedSnapshotRef.current;
          latestTargetRef.current = confirmed;
          applySnapshot(confirmed);
          onNotice({ kind: "error", trackName: track.name, message: result.error });
          return;
        }

        confirmedSnapshotRef.current = snapshot;
        if (requestId !== requestIdRef.current) return;

        if (options.offerUndo) {
          onNotice({
            kind: "saved",
            trackName: track.name,
            undo: () => {
              applySnapshot(previous);
              enqueueSave(previous, { offerUndo: false });
            },
          });
        } else {
          onNotice({ kind: "undone", trackName: track.name });
        }
      } catch {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        const confirmed = confirmedSnapshotRef.current;
        latestTargetRef.current = confirmed;
        applySnapshot(confirmed);
        onNotice({
          kind: "error",
          trackName: track.name,
          message: "Your change was not saved. Try again.",
        });
      } finally {
        if (mountedRef.current) setPendingSaves((count) => Math.max(0, count - 1));
      }
    });
  }

  function persist(over: Partial<{ rating: string; replay: string; notes: string }>) {
    const rawRating = over.rating ?? rating;
    const normalizedRating = normalizeRatingInput(rawRating);
    if (normalizedRating == null) {
      applySnapshot(confirmedSnapshotRef.current);
      onNotice({
        kind: "error",
        trackName: track.name,
        message: "Use a score from 0 to 10.",
      });
      return;
    }
    if (normalizedRating !== rawRating) setRating(normalizedRating);

    enqueueSave({
      rating: normalizedRating,
      replay: (over.replay ?? replay) as ReplayValue | "",
      notes: over.notes ?? notes,
    }, {
      offerUndo: true,
    });
  }

  const num = rating === "" ? null : Number(rating);

  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(38,37,33,0.06)] transition sm:p-4">
      {/* Track title */}
      <div className="flex items-center gap-3">
        <span className="w-5 shrink-0 text-right text-xs text-muted">
          {track.order}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-ink">{track.name}</span>
      </div>

      {/* Make score ownership visible without relying on avatar recognition or hover. */}
      <dl
        aria-label={`Ratings for ${track.name}`}
        className="mt-3 flex flex-wrap gap-2 pl-8"
      >
        <div className="flex min-w-32 flex-1 items-center justify-between gap-3 rounded-lg bg-ink px-3 py-2 text-paper shadow-[0_3px_10px_rgba(38,37,33,0.12)] sm:flex-none">
          <dt className="text-xs font-medium">You</dt>
          <dd className="text-sm font-semibold tabular-nums">
            {num != null ? formatScore(num) : "Not rated"}
          </dd>
        </div>

        {track.friends.map((friend, index) => {
          const name = friend.name?.trim() || "Friend";

          return (
            <div
              key={`${name}-${friend.avatar ?? index}-${index}`}
              className="flex min-w-36 flex-1 items-center gap-2 rounded-lg border border-line bg-ivory px-2.5 py-2 transition-colors hover:border-line-strong sm:flex-none"
            >
              <span aria-hidden="true" className="shrink-0">
                <Avatar url={friend.avatar} name={name} size={22} />
              </span>
              <dt className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                {name}
              </dt>
              <dd
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  scoreColor(friend.score),
                )}
              >
                {formatScore(friend.score)}
              </dd>
            </div>
          );
        })}
      </dl>

      {/* Quick-set slider */}
      <input
        type="range"
        min={0}
        max={10}
        step={0.1}
        value={num ?? 0}
        onChange={(e) => setRating(e.target.value)}
        onPointerUp={() => persist({})}
        onKeyUp={() => persist({})}
        aria-label={`Rating for ${track.name}`}
        className="mt-3 w-full accent-accent"
      />

      {/* Exact value */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={0}
          max={10}
          step={0.01}
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          onBlur={() => persist({})}
          placeholder="–"
          aria-label={`Exact rating for ${track.name}`}
          className="w-16 rounded-md border border-line bg-paper px-2 py-1 text-center text-sm text-ink outline-none transition-colors focus:border-line-strong"
        />

        {rating !== "" && (
          <button
            type="button"
            onClick={() => {
              setRating("");
              persist({ rating: "" });
            }}
            className="text-xs text-muted hover:text-accent"
          >
            clear
          </button>
        )}

        <span aria-live="polite" className="ml-auto text-xs whitespace-nowrap text-muted">
          {pendingSaves > 0 ? "saving…" : ""}
        </span>
      </div>

      {/* Replay value — separate axis from the score above, not a quick-rate shortcut */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-2">
        <span
          className="text-[10px] tracking-wide text-muted uppercase"
          title="Replay value — how often you'd come back to this track"
        >
          Would replay?
        </span>
        <div className="inline-flex overflow-hidden rounded-lg border border-line">
          {REPLAY_VALUES.map((rv) => (
            <button
              key={rv}
              type="button"
              onClick={() => {
                const next = replay === rv ? "" : rv;
                setReplay(next);
                persist({ replay: next });
              }}
              className={cn(
                "px-2.5 py-1 text-xs transition",
                replay === rv
                  ? "bg-accent text-white"
                  : "text-body hover:bg-ivory",
              )}
            >
              {SHORT[rv]}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => persist({})}
        placeholder="Add a note…"
        className="mt-2 w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink outline-none transition-colors focus:border-line-strong"
      />
    </div>
  );
}
