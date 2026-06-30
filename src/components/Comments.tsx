import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { CommentForm } from "@/components/CommentForm";
import { deleteComment } from "@/app/actions/comments";
import { formatDate } from "@/lib/utils";
import type { CommentTarget } from "@/lib/types";

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author: { display_name: string | null; avatar_url: string | null } | null;
};

export async function Comments({
  targetType,
  targetId,
  revalidate,
}: {
  targetType: CommentTarget;
  targetId: string;
  revalidate: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("comments")
    .select("id, body, created_at, user_id, author:profiles(display_name, avatar_url)")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: true });

  const comments = (data ?? []) as unknown as CommentRow[];

  return (
    <div className="space-y-4">
      <CommentForm
        targetType={targetType}
        targetId={targetId}
        revalidate={revalidate}
      />

      {comments.length === 0 ? (
        <p className="text-sm text-zinc-500">No comments yet. Start the thread.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar
                url={c.author?.avatar_url}
                name={c.author?.display_name}
                size={32}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {c.author?.display_name ?? "User"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatDate(c.created_at)}
                  </span>
                  {c.user_id === user?.id && (
                    <form action={deleteComment} className="ml-auto">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="revalidate" value={revalidate} />
                      <button
                        type="submit"
                        className="text-xs text-zinc-500 hover:text-red-400"
                      >
                        delete
                      </button>
                    </form>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap text-zinc-300">
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
