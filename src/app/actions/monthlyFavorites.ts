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

/** Relocate a pick into an empty slot — no swap partner, single round trip. */
export async function moveMonthlyFavorite(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("id") || "");
  const month = String(formData.get("month") || "");
  const target = Number(formData.get("target") || 0);
  if (!id || !month || target < 1 || target > 5) return;

  await supabase
    .from("monthly_favorites")
    .update({ position: target })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/favourites");
  revalidatePath(`/favourites/${month.slice(0, 7)}`);
}

/**
 * Swap two occupied slots. The caller (already holding both rows client-side)
 * supplies rowA's id/data and rowB's id directly, so this needs no SELECT
 * before the delete/update/insert — cuts the round trip from 4 to 3.
 */
export async function swapMonthlyFavoritePosition(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const month = String(formData.get("month") || "");
  const rowAId = String(formData.get("row_a_id") || "");
  const rowBId = String(formData.get("row_b_id") || "");
  const a = Number(formData.get("position") || 0); // rowA's current position
  const b = Number(formData.get("target") || 0); // rowB's current position
  const title = String(formData.get("title") || "").trim();
  const artist = String(formData.get("artist") || "").trim();
  const cover_url = String(formData.get("cover_url") || "").trim() || null;
  const external_id = String(formData.get("external_id") || "").trim() || null;
  if (
    !month ||
    !rowAId ||
    !rowBId ||
    a < 1 ||
    a > 5 ||
    b < 1 ||
    b > 5 ||
    a === b ||
    !title ||
    !artist
  )
    return;

  // The `position` check constraint (1-5) rules out staging through an
  // out-of-range value, and updating either row straight to the other's
  // position would collide with the unique(user_id,month,position) index.
  // Delete rowA first (freeing slot `a`), move rowB into it, then reinsert
  // rowA's data into the now-free slot `b`. Each call is scoped to the
  // caller's own rows (also backstopped by RLS).
  await supabase
    .from("monthly_favorites")
    .delete()
    .eq("id", rowAId)
    .eq("user_id", user.id);
  await supabase
    .from("monthly_favorites")
    .update({ position: a })
    .eq("id", rowBId)
    .eq("user_id", user.id);
  await supabase.from("monthly_favorites").insert({
    user_id: user.id,
    month,
    position: b,
    title,
    artist,
    cover_url,
    external_id,
  });

  revalidatePath("/favourites");
  revalidatePath(`/favourites/${month.slice(0, 7)}`);
}
