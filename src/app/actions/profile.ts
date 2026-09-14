"use server";

import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const EXTENSION_TOKEN_PREFIX = "baa_ext_";

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
