"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SaveToast } from "@/components/track-rating/SaveToast";
import { TrackRatingRow } from "@/components/track-rating/TrackRatingRow";
import type {
  SaveNotice,
  Toast,
  TrackRow,
  Viewer,
} from "@/components/track-rating/types";

export function TrackRatingTable({
  albumId,
  tracks,
  viewer,
  revalidate,
}: {
  albumId: string;
  tracks: TrackRow[];
  viewer: Viewer;
  revalidate: string;
}) {
  const [toast, setToast] = useState<Toast | null>(null);
  const toastIdRef = useRef(0);
  const toastTimerRef = useRef<number | null>(null);
  const [ratedTrackIds, setRatedTrackIds] = useState(
    () => new Set(tracks.filter((track) => track.rating != null).map((track) => track.id)),
  );
  const ratedCount = ratedTrackIds.size;

  const updateRatedState = useCallback((trackId: string, rated: boolean) => {
    setRatedTrackIds((current) => {
      if (current.has(trackId) === rated) return current;
      const next = new Set(current);
      if (rated) next.add(trackId);
      else next.delete(trackId);
      return next;
    });
  }, []);

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
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-ivory px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-ink">Album progress</span>
            <span className="text-muted tabular-nums">
              {ratedCount} of {tracks.length} rated
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`${ratedCount} of ${tracks.length} tracks rated`}
            aria-valuemin={0}
            aria-valuemax={tracks.length}
            aria-valuenow={ratedCount}
            className="h-1.5 overflow-hidden rounded-full bg-line"
          >
            <div
              className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-500 motion-reduce:transition-none"
              style={{ transform: `scaleX(${tracks.length ? ratedCount / tracks.length : 0})` }}
            />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {tracks.map((t) => (
          <div key={t.id} id={`track-${t.id}`} className="scroll-mt-20">
            <TrackRatingRow
              albumId={albumId}
              track={t}
              viewer={viewer}
              revalidate={revalidate}
              onNotice={showNotice}
              onSaveStart={dismissNotice}
              onRatedChange={updateRatedState}
            />
          </div>
        ))}
      </div>

      {toast ? <SaveToast key={toast.id} toast={toast} onDismiss={dismissNotice} /> : null}
    </>
  );
}
