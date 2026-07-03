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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 transition sm:p-4">
      {/* Track + big score */}
      <div className="flex items-center gap-3">
        <span className="w-5 shrink-0 text-right text-xs text-zinc-500">
          {track.order}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{track.name}</span>
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
        className="mt-3 w-full accent-violet-500"
      />

      {/* Replay buttons + exact value */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-lg border border-zinc-700">
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
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800",
              )}
            >
              {SHORT[rv]}
            </button>
          ))}
        </div>

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
          className="w-16 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-center text-sm outline-none focus:border-violet-500"
        />

        {rating !== "" && (
          <button
            type="button"
            onClick={() => {
              setRating("");
              persist({ rating: "" });
            }}
            className="text-xs text-zinc-500 hover:text-red-400"
          >
            clear
          </button>
        )}

        <span
          className={cn(
            "ml-auto text-xs whitespace-nowrap text-emerald-500 transition-opacity",
            saved ? "opacity-100" : "opacity-0",
          )}
        >
          ✓ saved
        </span>
      </div>

      {/* Notes */}
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => persist({})}
        placeholder="Add a note…"
        className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm outline-none focus:border-violet-500"
      />

      {/* Friends' scores for this track */}
      {track.friends.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[10px] tracking-wide text-zinc-500 uppercase">
            Friends
          </span>
          {track.friends.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/60 px-1.5 py-0.5"
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
