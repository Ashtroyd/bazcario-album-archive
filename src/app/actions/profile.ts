"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const update: Record<string, unknown> = {};
  const displayName = String(formData.get("display_name") || "").trim();
  if (displayName) update.display_name = displayName;

  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (!upErr) {
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      update.avatar_url = pub.publicUrl;
    }
  }

  if (Object.keys(update).length > 0) {
    await supabase.from("profiles").update(update).eq("id", user.id);
  }
  revalidatePath("/profile");
  revalidatePath("/", "layout");
}

export async function setFavoriteTrack(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const favorite_track_id =
    String(formData.get("favorite_track_id") || "") || null;
  await supabase
    .from("profiles")
    .update({ favorite_track_id })
    .eq("id", user.id);
  revalidatePath("/profile");
  revalidatePath("/", "layout");
}
