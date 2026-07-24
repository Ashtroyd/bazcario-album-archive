"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signout } from "@/app/actions/auth";
import { Avatar } from "@/components/Avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IconBell, IconHeadphones } from "@/components/icons";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/albums", label: "Library" },
  { href: "/friends", label: "Friends" },
  { href: "/announcements", label: "Announcements" },
];

export function AppNav({
  profile,
  unreadCount,
}: {
  profile: { display_name: string | null; avatar_url: string | null };
  unreadCount: number;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4">
        <Link
          href="/"
          className="mr-2 flex items-center gap-2 whitespace-nowrap"
        >
          <IconHeadphones size={22} className="text-accent" />
          <span className="hidden font-serif text-lg font-semibold text-ink sm:inline">
            Archive
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                isActive(l.href)
                  ? "bg-ivory text-ink"
                  : "text-body hover:bg-ivory hover:text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/album/new"
            className="hidden btn btn-primary px-3 py-1.5 sm:inline-flex"
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">Add album</span>
          </Link>
          <ThemeToggle />
          <Link
            href="/notifications"
            title="Notifications"
            className={cn(
              "relative hidden rounded-full px-2 py-1.5 transition-colors sm:inline-flex",
              isActive("/notifications")
                ? "bg-ivory text-ink"
                : "text-body hover:bg-ivory hover:text-ink",
            )}
          >
            <IconBell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link
            href="/profile"
            title="Profile"
            className="rounded-full ring-2 ring-line-strong transition hover:ring-accent"
          >
            <Avatar url={profile.avatar_url} name={profile.display_name} size={34} />
          </Link>
          <form action={signout} className="hidden sm:block">
            <button type="submit" className="btn btn-ghost px-3 py-1.5">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
