"use client";

import { useState, useTransition } from "react";
import { saveTrackRating } from "@/app/actions/ratings";
import { Avatar } from "@/components/Avatar";
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
  return (
    <div className="space-y-2">
      {tracks.map((t) => (
        <TrackRow key={t.id} albumId={albumId} track={t} />
      ))}
    </div>
  );
}

function TrackRow({ albumId, track }: { albumId: string; track: Row }) {
  const [rating, setRating] = useState(
    track.rating != null ? String(track.rating) : "",
  );
  const [replay, setReplay] = useState<ReplayValue | "">(track.replay ?? "");
  const [notes, setNotes] = useState(track.notes ?? "");
  const [, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function persist(over: Partial<{ rating: string; replay: string; notes: string }>) {
    const fd = new FormData();
    fd.set("track_id", track.id);
    fd.set("album_id", albumId);
    fd.set("rating", over.rating ?? rating);
    fd.set("replay_value", over.replay ?? replay);
    fd.set("notes", over.notes ?? notes);
    startTransition(async () => {
      await saveTrackRating(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    });
  }

  const num = rating === "" ? null : Number(rating);

  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(38,37,33,0.06)] transition sm:p-4">
      {/* Track + big score */}
      <div className="flex items-center gap-3">
        <span className="w-5 shrink-0 text-right text-xs text-muted">
          {track.order}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-ink">{track.name}</span>
        <span
          className={cn(
            "w-14 shrink-0 text-right text-2xl font-bold tabular-nums",
            scoreColor(num),
          )}
        >
          {num != null ? formatScore(num) : "–"}
        </span>
      </div>

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
          aria-label="Exact rating"
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

        <span
          className={cn(
            "ml-auto text-xs whitespace-nowrap text-sage transition-opacity",
            saved ? "opacity-100" : "opacity-0",
          )}
        >
          ✓ saved
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

      {/* Friends' scores for this track */}
      {track.friends.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[10px] tracking-wide text-muted uppercase">
            Friends
          </span>
          {track.friends.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-ivory px-1.5 py-0.5"
              title={f.name ?? "Friend"}
            >
              <Avatar url={f.avatar} name={f.name} size={16} />
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  scoreColor(f.score),
                )}
              >
                {formatScore(f.score)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
