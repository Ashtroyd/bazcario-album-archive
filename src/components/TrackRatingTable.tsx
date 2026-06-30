"use client";

import { useState, useTransition } from "react";
import { saveTrackRating } from "@/app/actions/ratings";
import { REPLAY_VALUES, type ReplayValue } from "@/lib/types";
import { cn, scoreColor } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  order: number;
  rating: number | null;
  replay: ReplayValue | null;
  notes: string | null;
};

const inputBase =
  "rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm outline-none focus:border-violet-500";

export function TrackRatingTable({
  albumId,
  tracks,
}: {
  albumId: string;
  tracks: Row[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs tracking-wide text-zinc-500 uppercase">
            <th className="w-8 py-2 font-medium">#</th>
            <th className="py-2 font-medium">Song</th>
            <th className="w-24 py-2 font-medium">Rating</th>
            <th className="w-36 py-2 font-medium">Replay</th>
            <th className="py-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((t) => (
            <TrackRow key={t.id} albumId={albumId} track={t} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrackRow({ albumId, track }: { albumId: string; track: Row }) {
  const [rating, setRating] = useState(
    track.rating != null ? String(track.rating) : "",
  );
  const [replay, setReplay] = useState<string>(track.replay ?? "");
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
    <tr className="border-b border-zinc-900">
      <td className="py-1.5 text-zinc-500">{track.order}</td>
      <td className="py-1.5 pr-2 font-medium">{track.name}</td>
      <td className="py-1.5">
        <input
          type="number"
          min={0}
          max={10}
          step={0.01}
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          onBlur={() => persist({})}
          placeholder="–"
          className={cn(inputBase, "w-20 text-center font-semibold", scoreColor(num))}
        />
      </td>
      <td className="py-1.5">
        <select
          value={replay}
          onChange={(e) => {
            setReplay(e.target.value);
            persist({ replay: e.target.value });
          }}
          className={cn(inputBase, "w-32")}
        >
          <option value="">—</option>
          {REPLAY_VALUES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="py-1.5">
        <div className="flex items-center gap-2">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => persist({})}
            placeholder="Add a note…"
            className={cn(inputBase, "w-full")}
          />
          <span
            className={cn(
              "text-xs whitespace-nowrap text-emerald-500 transition-opacity",
              saved ? "opacity-100" : "opacity-0",
            )}
          >
            ✓ saved
          </span>
        </div>
      </td>
    </tr>
  );
}
