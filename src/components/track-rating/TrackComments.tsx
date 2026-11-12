"use client";

import { useState } from "react";
import { CommentsThread, type CommentRow } from "@/components/CommentsThread";
import { IconChevronDown, IconChevronUp } from "@/components/icons";
import type { Viewer } from "./types";

/** Collapsible comment thread for a single track. */
export function TrackComments({
  trackId,
  trackName,
  comments,
  viewer,
  revalidate,
}: {
  trackId: string;
  trackName: string;
  comments: CommentRow[];
  viewer: Viewer;
  revalidate: string;
}) {
  const [open, setOpen] = useState(false);
  const count = comments.length;
  const panelId = `track-comments-${trackId}`;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="btn btn-ghost -ml-2 min-h-11 px-2.5 py-1.5 text-xs sm:min-h-9"
      >
        {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        {count === 0
          ? "Comment"
          : `${count} comment${count === 1 ? "" : "s"}`}
      </button>
      {open ? (
        <div id={panelId} className="animate-context-in pt-2">
          <CommentsThread
            initialComments={comments}
            targetType="track"
            targetId={trackId}
            revalidate={revalidate}
            me={viewer}
            placeholder={`Comment on “${trackName}”…`}
          />
        </div>
      ) : null}
    </div>
  );
}
