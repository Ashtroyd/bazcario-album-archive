"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TARGETS = new Set(["album", "track", "rating"]);

export async function addComment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const target_type = String(formData.get("target_type") || "album");
  const target_id = String(formData.get("target_id") || "");
  const body = String(formData.get("body") || "").trim();
  const revalidate = String(formData.get("revalidate") || "");
  if (!TARGETS.has(target_type) || !target_id || !body) return;

  await supabase
    .from("comments")
    .insert({ target_type, target_id, user_id: user.id, body });
  if (revalidate) revalidatePath(revalidate);
}

export async function deleteComment(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  const revalidate = String(formData.get("revalidate") || "");
  if (id) await supabase.from("comments").delete().eq("id", id);
  if (revalidate) revalidatePath(revalidate);
}
