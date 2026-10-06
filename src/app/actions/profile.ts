"use server";

import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { validatePasswordChange } from "@/lib/password-policy";

const EXTENSION_TOKEN_PREFIX = "baa_ext_";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again to update your profile." };

  const update: Record<string, unknown> = {};
  const displayName = String(formData.get("display_name") || "").trim();
  if (displayName) update.display_name = displayName;
  const visibility = formData.get("visibility");
  if (visibility !== null) {
    if (!["friends", "public", "private"].includes(String(visibility))) return { error: "Choose a valid visibility setting." };
    update.visibility = visibility;
  }

  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (upErr) return { error: "Couldn't upload your avatar. Try again." };
    if (!upErr) {
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      update.avatar_url = pub.publicUrl;
    }
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
    if (error) return { error: "Couldn't save your profile. Try again." };
  }
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { error: null };
}

export async function changePassword(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email) return { error: "Sign in again to change your password." };
  const current = String(formData.get("current_password") ?? "");
  const password = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");
  const validationError = validatePasswordChange(current, password, confirm);
  if (validationError) return { error: validationError };
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (signInError) return { error: "Your current password wasn't accepted. Check it and try again." };
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error ? "Couldn't change your password. Try again, or use the password-reset email." : null };
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

export async function createExtensionToken(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to connect Spotify." };

  const { count } = await supabase
    .from("extension_access_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());
  if ((count ?? 0) >= 5) {
    return { ok: false, error: "Revoke an old Spotify connection before creating another." };
  }

  const token = `${EXTENSION_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("extension_access_tokens").insert({
    user_id: user.id,
    token_hash: tokenHash,
    label: "Spotify desktop",
    expires_at: expiresAt,
  });
  if (error) return { ok: false, error: "Could not create the Spotify connection." };

  revalidatePath("/profile");
  return { ok: true, token };
}

export async function revokeExtensionToken(tokenId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !tokenId) return;

  await supabase
    .from("extension_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("user_id", user.id);
  revalidatePath("/profile");
}
