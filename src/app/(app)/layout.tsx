import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { BottomNav } from "@/components/BottomNav";
import { FeatureTour } from "@/components/FeatureTour";
import { TourStarter } from "@/components/TourStarter";
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
      <a
        href="#main-content"
        className="fixed top-2 left-2 z-[100] -translate-y-16 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper shadow-lg transition-transform focus-visible:translate-y-0"
      >
        Skip to content
      </a>
      <AppNav
        profile={{
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        }}
        unreadCount={unreadCount}
      />
      <main id="main-content" className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:pb-6">
        {children}
      </main>
      <BottomNav unreadCount={unreadCount} />
      <TourStarter />
      <FeatureTour />
    </div>
  );
}
