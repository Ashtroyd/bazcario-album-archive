import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth";
import { CommentsThread } from "@/components/CommentsThread";
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
  const profile = await getMyProfile();

  const { data } = await supabase
    .from("comments")
    .select("id, body, created_at, user_id, author:profiles(display_name, avatar_url)")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: true });

  const comments = (data ?? []) as unknown as CommentRow[];

  return (
    <CommentsThread
      initialComments={comments}
      targetType={targetType}
      targetId={targetId}
      revalidate={revalidate}
      me={{
        id: profile!.id,
        name: profile?.display_name ?? null,
        avatar: profile?.avatar_url ?? null,
      }}
    />
  );
}
