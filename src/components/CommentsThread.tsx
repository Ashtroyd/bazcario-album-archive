"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { addComment, deleteComment } from "@/app/actions/comments";
import { Avatar } from "@/components/Avatar";
import { formatDate } from "@/lib/utils";
import type { CommentTarget } from "@/lib/types";

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author: { display_name: string | null; avatar_url: string | null } | null;
};

type Action =
  | { type: "add"; comment: CommentRow }
  | { type: "remove"; id: string };

function reducer(state: CommentRow[], action: Action): CommentRow[] {
  switch (action.type) {
    case "add":
      return [...state, action.comment];
    case "remove":
      return state.filter((c) => c.id !== action.id);
  }
}

export function CommentsThread({
  initialComments,
  targetType,
  targetId,
  revalidate,
  me,
}: {
  initialComments: CommentRow[];
  targetType: CommentTarget;
  targetId: string;
  revalidate: string;
  me: { id: string; name: string | null; avatar: string | null };
}) {
  const [comments, applyOptimistic] = useOptimistic(initialComments, reducer);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    const body = String(formData.get("body") || "").trim();
    if (!body) return;
    formRef.current?.reset();

    startTransition(async () => {
      applyOptimistic({
        type: "add",
        comment: {
          id: `temp-${Date.now()}`,
          body,
          created_at: new Date().toISOString(),
          user_id: me.id,
          author: { display_name: me.name, avatar_url: me.avatar },
        },
      });
      const fd = new FormData();
      fd.set("target_type", targetType);
      fd.set("target_id", targetId);
      fd.set("body", body);
      fd.set("revalidate", revalidate);
      await addComment(fd);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "remove", id });
      const fd = new FormData();
      fd.set("id", id);
      fd.set("revalidate", revalidate);
      await deleteComment(fd);
    });
  }

  return (
    <div className="space-y-4">
      <form ref={formRef} action={submit} className="flex gap-2">
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

      {comments.length === 0 ? (
        <p className="text-sm text-muted">No comments yet. Start the thread.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar
                url={c.author?.avatar_url}
                name={c.author?.display_name}
                size={32}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">
                    {c.author?.display_name ?? "User"}
                  </span>
                  <span className="text-xs text-muted">
                    {formatDate(c.created_at)}
                  </span>
                  {c.user_id === me.id && (
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="ml-auto text-xs text-muted hover:text-accent"
                    >
                      delete
                    </button>
                  )}
                </div>
                <p className="text-sm break-words whitespace-pre-wrap text-body">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
