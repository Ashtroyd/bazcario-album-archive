import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { BottomNav } from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import { getUnreadCount } from "@/lib/notifications";
import type { Profile } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profileData) redirect("/login");
  const profile = profileData as Profile;

  const unreadCount = await getUnreadCount(supabase, user.id);

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav
        profile={{
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        }}
        unreadCount={unreadCount}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}
