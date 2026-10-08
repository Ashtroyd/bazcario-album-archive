"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isQueueStatus } from "@/lib/listening-queue";

export async function setListeningQueue(albumId: string, status: string | null) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(albumId) || (status !== null && !isQueueStatus(status))) return { ok: false as const, error: "Choose a valid album and listening status." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in again to update your queue." };
  const { error } = status === null
    ? await supabase.from("album_listening_queue").delete().eq("user_id", user.id).eq("album_id", albumId)
    : await supabase.from("album_listening_queue").upsert({ user_id: user.id, album_id: albumId, status, updated_at: new Date().toISOString() }, { onConflict: "user_id,album_id" });
  if (error) return { ok: false as const, error: "Your queue wasn’t updated. Try again." };
  for (const path of ["/queue", "/", "/albums", "/friends", `/album/${albumId}`]) revalidatePath(path);
  return { ok: true as const };
}
