"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safePath(p: unknown): string {
  const s = typeof p === "string" ? p : "/";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safePath(formData.get("redirect"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const displayName =
    String(formData.get("display_name") || "").trim() || email.split("@")[0];

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }
  if (data.session) {
    // Email confirmation disabled — user is signed in immediately.
    revalidatePath("/", "layout");
    redirect("/");
  }
  redirect(
    `/login?message=${encodeURIComponent(
      "Account created. Check your email to confirm, then sign in.",
    )}`,
  );
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
