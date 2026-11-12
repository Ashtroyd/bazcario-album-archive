"use client";

import { useEffect, useRef, useState } from "react";
import { saveTrackRating } from "@/app/actions/ratings";
import { Avatar } from "@/components/Avatar";
import { IconChevronDown, IconChevronUp } from "@/components/icons";
import { normalizeRatingInput } from "@/lib/ratingInput";
import { REPLAY_VALUES, type ReplayValue } from "@/lib/types";
import { cn, formatScore, scoreColor } from "@/lib/utils";
import { TrackComments } from "./TrackComments";
import {
  SHORT_REPLAY,
  type RatingSnapshot,
  type SaveNotice,
  type TrackRow,
  type Viewer,
} from "./types";

function snapshotsMatch(a: RatingSnapshot, b: RatingSnapshot): boolean {
  return a.rating === b.rating && a.replay === b.replay && a.notes === b.notes;
}

export function TrackRatingRow({
  albumId,
  track,
  viewer,
  revalidate,
  onNotice,
  onSaveStart,
  onRatedChange,
}: {
  albumId: string;
  track: TrackRow;
  viewer: Viewer;
  revalidate: string;
  onNotice: (notice: SaveNotice) => void;
  onSaveStart: () => void;
  onRatedChange: (trackId: string, rated: boolean) => void;
}) {
  const [rating, setRating] = useState(
    track.rating != null ? String(track.rating) : "",
  );
  const [replay, setReplay] = useState<ReplayValue | "">(track.replay ?? "");
  const [notes, setNotes] = useState(track.notes ?? "");
  const [expanded, setExpanded] = useState(false);
  const [pendingSaves, setPendingSaves] = useState(0);
  const [hasSaved, setHasSaved] = useState(false);
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
        onRatedChange(track.id, snapshot.rating !== "");
        setHasSaved(true);
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
    <div className={cn(
      "surface-item p-3 transition-[box-shadow,background-color] sm:p-4",
      expanded ? "surface-selected" : "",
    )}>
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
              className="flex min-w-36 flex-1 items-center gap-2 rounded-lg bg-ivory px-2.5 py-2 transition-colors hover:bg-line sm:flex-none"
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
        name={`rating-slider-${track.id}`}
        type="range"
        min={0}
        max={10}
        step={0.1}
        value={num ?? 0}
        onChange={(e) => setRating(e.target.value)}
        onPointerUp={() => persist({})}
        onKeyUp={() => persist({})}
        aria-label={`Rating for ${track.name}`}
        aria-valuetext={num == null ? "Not rated" : `${formatScore(num)} out of 10`}
        className="mt-3 w-full accent-accent"
      />

      {/* Exact value */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          name={`rating-${track.id}`}
          type="number"
          min={0}
          max={10}
          step={0.01}
          inputMode="decimal"
          autoComplete="off"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          onBlur={() => persist({})}
          placeholder="–"
          aria-label={`Exact rating for ${track.name}`}
          className="w-16 rounded-md border border-line bg-paper px-2 py-1 text-center text-sm text-ink transition-colors focus:border-line-strong"
        />

        {rating !== "" && (
          <button
            type="button"
            onClick={() => {
              setRating("");
              setExpanded(false);
              persist({ rating: "" });
            }}
            className="text-xs text-muted hover:text-accent"
          >
            clear
          </button>
        )}

        <span aria-live="polite" className="ml-auto text-xs whitespace-nowrap text-muted">
          {pendingSaves > 0 ? "Saving…" : hasSaved ? "Saved" : ""}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          disabled={rating === ""}
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={`track-details-${track.id}`}
          className="btn btn-ghost -ml-2 min-h-11 px-2.5 py-1.5 text-xs sm:min-h-9"
        >
          {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          {rating === ""
            ? "Rate to add details"
            : expanded
              ? "Hide details"
              : replay || notes
                ? "Edit details"
                : "Add details"}
        </button>
        {!expanded && rating !== "" && (replay || notes) ? (
          <span className="min-w-0 truncate text-xs text-muted">
            {[replay ? `${replay} replay` : null, notes || null].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </div>

      {expanded ? (
        <div id={`track-details-${track.id}`} className="animate-context-in">
          <div className="space-y-3 pt-3">
            <fieldset>
              <legend className="label">Would replay?</legend>
              <div className="inline-flex max-w-full overflow-hidden rounded-lg border border-line">
                {REPLAY_VALUES.map((rv) => (
                  <button
                    key={rv}
                    type="button"
                    aria-pressed={replay === rv}
                    onClick={() => {
                      const next = replay === rv ? "" : rv;
                      setReplay(next);
                      persist({ replay: next });
                    }}
                    className={cn(
                      "min-h-11 px-2.5 py-1 text-xs transition-colors sm:min-h-9",
                      replay === rv ? "bg-accent text-white" : "text-body hover:bg-ivory",
                    )}
                  >
                    {SHORT_REPLAY[rv]}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="label">Listening note</span>
              <input
                name={`notes-${track.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => persist({})}
                placeholder="A lyric, feeling, or moment…"
                autoComplete="off"
                className="input"
              />
            </label>
          </div>
        </div>
      ) : null}

      <TrackComments
        trackId={track.id}
        trackName={track.name}
        comments={track.comments}
        viewer={viewer}
        revalidate={revalidate}
      />
    </div>
  );
}
