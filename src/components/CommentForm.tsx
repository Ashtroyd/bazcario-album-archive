"use client";

import { useRef } from "react";
import { addComment } from "@/app/actions/comments";
import type { CommentTarget } from "@/lib/types";

export function CommentForm({
  targetType,
  targetId,
  revalidate,
}: {
  targetType: CommentTarget;
  targetId: string;
  revalidate: string;
}) {
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await addComment(fd);
        ref.current?.reset();
      }}
      className="flex gap-2"
    >
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />
      <input type="hidden" name="revalidate" value={revalidate} />
      <input
        name="body"
        required
        maxLength={2000}
        placeholder="Add a comment…"
        className="input"
      />
      <button type="submit" className="btn btn-primary">
        Post
      </button>
    </form>
  );
}
