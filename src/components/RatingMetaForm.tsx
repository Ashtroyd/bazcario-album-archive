"use client";

import { useActionState } from "react";
import {
  saveRatingMeta,
  type RatingMetaSaveState,
} from "@/app/actions/ratings";
import type { Rating, Track } from "@/lib/types";

const INITIAL_STATE: RatingMetaSaveState = { status: "idle", message: "" };

export function RatingMetaForm({
  albumId,
  tracks,
  rating,
}: {
  albumId: string;
  tracks: Track[];
  rating: Rating | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveRatingMeta,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="card space-y-3">
      <input type="hidden" name="album_id" value={albumId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label className="label" htmlFor="first_listen_date">
            First listen
          </label>
          <input
            id="first_listen_date"
            type="date"
            name="first_listen_date"
            defaultValue={rating?.first_listen_date ?? ""}
            className="input min-w-0"
          />
        </div>
        <div className="hidden sm:block" />

        <div className="min-w-0">
          <label className="label" htmlFor="favorite_track_id">
            Favorite track
          </label>
          <select
            id="favorite_track_id"
            name="favorite_track_id"
            defaultValue={rating?.favorite_track_id ?? ""}
            className="input min-w-0"
          >
            <option value="">—</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label className="label" htmlFor="least_favorite_track_id">
            Least favorite
          </label>
          <select
            id="least_favorite_track_id"
            name="least_favorite_track_id"
            defaultValue={rating?.least_favorite_track_id ?? ""}
            className="input min-w-0"
          >
            <option value="">—</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Album notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={rating?.notes ?? ""}
          placeholder="Overall thoughts…"
          className="input"
        />
      </div>

      <div className="flex min-h-10 flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : "Save details"}
        </button>
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`text-xs ${state.status === "error" ? "text-accent" : "text-body"}`}
        >
          {pending ? "Saving album details…" : state.message}
        </p>
      </div>
    </form>
  );
}
