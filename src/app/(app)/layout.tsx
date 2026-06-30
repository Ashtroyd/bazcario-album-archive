import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { getMyProfile } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav
        profile={{
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        }}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
