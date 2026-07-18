"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Upsert one favourite-song slot (1-5) for a given month. */
export async function setMonthlyFavorite(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const month = String(formData.get("month") || "");
  const position = Number(formData.get("position") || 0);
  const title = String(formData.get("title") || "").trim();
  const artist = String(formData.get("artist") || "").trim();
  const cover_url = String(formData.get("cover_url") || "").trim() || null;
  const external_id = String(formData.get("external_id") || "").trim() || null;
  if (!month || position < 1 || position > 5 || !title || !artist) return;

  await supabase.from("monthly_favorites").upsert(
    {
      user_id: user.id,
      month,
      position,
      title,
      artist,
      cover_url,
      external_id,
    },
    { onConflict: "user_id,month,position" },
  );
  revalidatePath("/favourites");
  revalidatePath(`/favourites/${month.slice(0, 7)}`);
  revalidatePath("/", "layout");
}

export async function removeMonthlyFavorite(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("id") || "");
  const month = String(formData.get("month") || "");
  if (!id) return;

  await supabase
    .from("monthly_favorites")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/favourites");
  if (month) revalidatePath(`/favourites/${month.slice(0, 7)}`);
  revalidatePath("/", "layout");
}

/** Swap the position of two picks within the same month (simple reorder). */
export async function swapMonthlyFavoritePosition(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const month = String(formData.get("month") || "");
  const a = Number(formData.get("position") || 0);
  const b = Number(formData.get("target") || 0);
  if (!month || a < 1 || a > 5 || b < 1 || b > 5 || a === b) return;

  const { data: rows } = await supabase
    .from("monthly_favorites")
    .select("id, position, title, artist, cover_url, external_id")
    .eq("user_id", user.id)
    .eq("month", month)
    .in("position", [a, b]);
  const rowA = rows?.find((r) => r.position === a);
  const rowB = rows?.find((r) => r.position === b);
  if (!rowA || !rowB) return;

  // The `position` check constraint (1-5) rules out staging through an
  // out-of-range value, and updating either row straight to the other's
  // position would collide with the unique(user_id,month,position) index.
  // Delete rowA first (freeing slot `a`), move rowB into it, then reinsert
  // rowA's data into the now-free slot `b`.
  await supabase.from("monthly_favorites").delete().eq("id", rowA.id);
  await supabase.from("monthly_favorites").update({ position: a }).eq("id", rowB.id);
  await supabase.from("monthly_favorites").insert({
    user_id: user.id,
    month,
    position: b,
    title: rowA.title,
    artist: rowA.artist,
    cover_url: rowA.cover_url,
    external_id: rowA.external_id,
  });

  revalidatePath("/favourites");
  revalidatePath(`/favourites/${month.slice(0, 7)}`);
}
