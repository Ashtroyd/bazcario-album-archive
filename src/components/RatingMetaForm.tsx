"use client";

import { useRef, useState } from "react";
import { saveRatingMeta, type RatingMetaSaveState } from "@/app/actions/ratings";
import type { Rating, Track } from "@/lib/types";

const INITIAL_STATE: RatingMetaSaveState = { status: "idle", message: "" };

type Field = "first_listen_date" | "favorite_track_id" | "least_favorite_track_id" | "notes";
type Snapshot = Record<Field, string>;
type FieldFeedback = Partial<Record<Field, { status: "saving" | "saved" | "error"; message?: string }>>;

function Status({
  field,
  feedback,
  onRetry,
}: {
  field: Field;
  feedback: FieldFeedback;
  onRetry: () => void;
}) {
  const state = feedback[field];
  if (!state) return null;

  return (
    <span className={`inline-flex items-center gap-2 text-xs ${state.status === "error" ? "text-accent" : "text-muted"}`}>
      <span role="status" aria-live="polite">{state.status === "saving"
        ? "Saving…"
        : state.status === "saved"
          ? "Saved"
          : state.message ?? "Not saved."}</span>
      {state.status === "error" ? (
        <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
          Try Again
        </button>
      ) : null}
    </span>
  );
}

export function RatingMetaForm({
  albumId,
  tracks,
  rating,
}: {
  albumId: string;
  tracks: Track[];
  rating: Rating | null;
}) {
  const [values, setValues] = useState<Snapshot>({
    first_listen_date: rating?.first_listen_date ?? "",
    favorite_track_id: rating?.favorite_track_id ?? "",
    least_favorite_track_id: rating?.least_favorite_track_id ?? "",
    notes: rating?.notes ?? "",
  });
  const [feedback, setFeedback] = useState<FieldFeedback>({});
  const queueRef = useRef(Promise.resolve());
  const latestTargetRef = useRef(JSON.stringify(values));
  const requestIdsRef = useRef<Partial<Record<Field, number>>>({});

  function enqueueSave(field: Field, next: Snapshot, force = false) {
    const serialized = JSON.stringify(next);
    if (!force && serialized === latestTargetRef.current) return;
    latestTargetRef.current = serialized;

    const requestId = (requestIdsRef.current[field] ?? 0) + 1;
    requestIdsRef.current[field] = requestId;
    setFeedback((current) => ({ ...current, [field]: { status: "saving" } }));

    const formData = new FormData();
    formData.set("album_id", albumId);
    for (const [name, value] of Object.entries(next)) formData.set(name, value);

    queueRef.current = queueRef.current.then(async () => {
      try {
        const result = await saveRatingMeta(INITIAL_STATE, formData);
        if (requestIdsRef.current[field] !== requestId) return;
        setFeedback((current) => ({
          ...current,
          [field]: result.status === "success"
            ? { status: "saved" }
            : { status: "error", message: result.message },
        }));
        if (result.status !== "success" && latestTargetRef.current === serialized) {
          latestTargetRef.current = "";
        }
      } catch {
        if (requestIdsRef.current[field] !== requestId) return;
        setFeedback((current) => ({
          ...current,
          [field]: { status: "error", message: "Not saved. Check your connection." },
        }));
        if (latestTargetRef.current === serialized) latestTargetRef.current = "";
      }
    });
  }

  function update(field: Field, value: string, saveNow: boolean) {
    const next = { ...values, [field]: value };
    setValues(next);
    if (saveNow) enqueueSave(field, next);
  }

  return (
    <div className="card space-y-4">
      <p className="text-sm text-muted">Changes save automatically.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="min-w-0">
          <span className="label">First listen</span>
          <input
            type="date"
            name="first_listen_date"
            value={values.first_listen_date}
            onChange={(event) => update("first_listen_date", event.target.value, true)}
            autoComplete="off"
            className="input"
          />
          <span className="mt-1.5 block min-h-4"><Status field="first_listen_date" feedback={feedback} onRetry={() => enqueueSave("first_listen_date", values, true)} /></span>
        </label>

        <div className="hidden sm:block" />

        <label className="min-w-0">
          <span className="label">Favorite track</span>
          <select
            name="favorite_track_id"
            value={values.favorite_track_id}
            onChange={(event) => update("favorite_track_id", event.target.value, true)}
            autoComplete="off"
            className="input"
          >
            <option value="">—</option>
            {tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}
          </select>
          <span className="mt-1.5 block min-h-4"><Status field="favorite_track_id" feedback={feedback} onRetry={() => enqueueSave("favorite_track_id", values, true)} /></span>
        </label>

        <label className="min-w-0">
          <span className="label">Least favorite</span>
          <select
            name="least_favorite_track_id"
            value={values.least_favorite_track_id}
            onChange={(event) => update("least_favorite_track_id", event.target.value, true)}
            autoComplete="off"
            className="input"
          >
            <option value="">—</option>
            {tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}
          </select>
          <span className="mt-1.5 block min-h-4"><Status field="least_favorite_track_id" feedback={feedback} onRetry={() => enqueueSave("least_favorite_track_id", values, true)} /></span>
        </label>
      </div>

      <label className="block">
        <span className="label">Album notes</span>
        <textarea
          name="notes"
          rows={3}
          value={values.notes}
          onChange={(event) => update("notes", event.target.value, false)}
          onBlur={() => enqueueSave("notes", values)}
          placeholder="Overall thoughts…"
          autoComplete="off"
          className="input resize-y"
        />
        <span className="mt-1.5 block min-h-4"><Status field="notes" feedback={feedback} onRetry={() => enqueueSave("notes", values, true)} /></span>
      </label>
    </div>
  );
}
