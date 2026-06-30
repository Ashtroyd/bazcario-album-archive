"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FoundUser = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

/** Search for people to friend (SECURITY DEFINER RPC, excludes yourself). */
export async function searchUsers(query: string): Promise<FoundUser[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_profiles", { q });
  return (data ?? []) as FoundUser[];
}

export async function sendFriendRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const friendId = String(formData.get("friend_id") || "");
  if (!friendId || friendId === user.id) return;

  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status, user_id, friend_id")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`,
    )
    .maybeSingle();

  if (existing) {
    // They already requested me → accept instead of duplicating.
    if (existing.status === "pending" && existing.friend_id === user.id) {
      await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", existing.id);
      revalidatePath("/", "layout");
    }
    revalidatePath("/friends");
    return;
  }

  await supabase
    .from("friendships")
    .insert({ user_id: user.id, friend_id: friendId, status: "pending" });
  revalidatePath("/friends");
}

export async function acceptFriend(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  if (id) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
  }
  revalidatePath("/friends");
  revalidatePath("/", "layout");
}

/** Decline an incoming request, cancel an outgoing one, or unfriend. */
export async function removeFriend(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  if (id) {
    await supabase.from("friendships").delete().eq("id", id);
  }
  revalidatePath("/friends");
  revalidatePath("/", "layout");
}
