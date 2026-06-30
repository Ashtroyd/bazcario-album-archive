"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchCoverArt } from "@/lib/coverart";

/** Look up cover art (used by the add-album form's "Fetch cover" button). */
export async function lookupCover(
  title: string,
  artist: string,
): Promise<string | null> {
  return fetchCoverArt(title, artist);
}

export async function createAlbum(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") || "").trim();
  const artist = String(formData.get("artist") || "").trim();
  if (!title || !artist) {
    redirect(
      `/album/new?error=${encodeURIComponent("Title and artist are required")}`,
    );
  }

  const yearRaw = String(formData.get("release_year") || "").trim();
  const release_year = yearRaw && /^\d{1,4}$/.test(yearRaw) ? Number(yearRaw) : null;
  const genre = String(formData.get("genre") || "").trim() || null;

  // Cover precedence: uploaded file → fetched URL (hidden field) → auto-fetch.
  let cover_image_url: string | null =
    String(formData.get("cover_url") || "").trim() || null;

  const file = formData.get("cover_file");
  if (file instanceof File && file.size > 0) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("covers")
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (!error) {
      cover_image_url = supabase.storage.from("covers").getPublicUrl(path)
        .data.publicUrl;
    }
  }
  if (!cover_image_url) {
    cover_image_url = await fetchCoverArt(title, artist);
  }

  const { data: album, error: albErr } = await supabase
    .from("albums")
    .insert({ title, artist, release_year, genre, cover_image_url, created_by: user.id })
    .select("id")
    .single();
  if (albErr || !album) {
    redirect(
      `/album/new?error=${encodeURIComponent("Could not create album")}`,
    );
  }

  const trackNames = formData
    .getAll("track")
    .map((t) => String(t).trim())
    .filter(Boolean);
  if (trackNames.length > 0) {
    const rows = trackNames.map((name, i) => ({
      album_id: album.id,
      name,
      track_order: i + 1,
    }));
    await supabase.from("tracks").insert(rows);
  }

  revalidatePath("/albums");
  redirect(`/album/${album.id}`);
}

export async function updateAlbumCover(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const albumId = String(formData.get("album_id") || "");
  if (!albumId) return;

  let cover_image_url: string | null = null;
  const file = formData.get("cover_file");
  if (file instanceof File && file.size > 0) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${albumId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("covers")
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (!error) {
      cover_image_url = supabase.storage.from("covers").getPublicUrl(path)
        .data.publicUrl;
    }
  } else {
    cover_image_url = String(formData.get("cover_url") || "").trim() || null;
  }

  if (cover_image_url) {
    await supabase
      .from("albums")
      .update({ cover_image_url })
      .eq("id", albumId);
  }
  revalidatePath(`/album/${albumId}`);
}

export async function deleteAlbum(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  if (id) {
    await supabase.from("albums").delete().eq("id", id);
  }
  revalidatePath("/albums");
  redirect("/albums");
}
