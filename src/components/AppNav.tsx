"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { IconHeadphones } from "@/components/icons";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home", section: "home", tour: undefined },
  { href: "/albums", label: "Library", section: "library", tour: undefined },
  { href: "/friends", label: "Friends", section: "friends", tour: "friends-nav" },
  { href: "/activity", label: "Activity", section: "activity", tour: "activity-nav" },
] as const;

type Section = (typeof LINKS)[number]["section"];

function sectionIsActive(section: Section, pathname: string) {
  if (section === "home") return pathname === "/";
  if (section === "library") {
    return (
      pathname.startsWith("/albums") ||
      pathname.startsWith("/songs") ||
      (pathname.startsWith("/album/") && pathname !== "/album/new")
    );
  }
  if (section === "friends") return pathname.startsWith("/friends");
  return (
    pathname.startsWith("/activity") ||
    pathname.startsWith("/announcements") ||
    pathname.startsWith("/notifications")
  );
}

export function AppNav({
  profile,
  unreadCount,
}: {
  profile: { display_name: string | null; avatar_url: string | null };
  unreadCount: number;
}) {
  const pathname = usePathname();

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

        <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-tour={link.tour}
              aria-current={sectionIsActive(link.section, pathname) ? "page" : undefined}
              className={cn(
                "relative rounded-full px-3 py-1.5 text-sm transition-colors",
                sectionIsActive(link.section, pathname)
                  ? "bg-ivory text-ink"
                  : "text-body hover:bg-ivory hover:text-ink",
              )}
            >
              {link.label}
              {link.section === "activity" && unreadCount > 0 ? (
                <span
                  aria-label={`${unreadCount} unread`}
                  className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white ring-2 ring-paper"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/album/new"
            data-tour="add-album"
            className="hidden btn btn-primary px-3 py-1.5 sm:inline-flex"
          >
            <span className="text-base leading-none">+</span>
            <span>Add album</span>
          </Link>
          <AccountMenu profile={profile} />
        </div>
      </div>
    </header>
  );
}
