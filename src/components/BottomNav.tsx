"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconHome,
  IconDisc,
  IconPlus,
  IconUsers,
  IconBell,
} from "@/components/icons";

const ITEMS = [
  { href: "/", label: "Home", Icon: IconHome },
  { href: "/albums", label: "Library", Icon: IconDisc },
  { href: "/album/new", label: "Add", Icon: IconPlus },
  { href: "/friends", label: "Friends", Icon: IconUsers },
  { href: "/notifications", label: "Alerts", Icon: IconBell },
];

/** Mobile-only floating glass tab bar (top bar keeps profile + logo on phones). */
export function BottomNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      className="fixed inset-x-3 z-30 sm:hidden"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-sm items-stretch justify-around rounded-full border border-line/70 bg-surface/75 px-1.5 py-1.5 shadow-[0_10px_30px_rgba(38,37,33,0.22)] backdrop-blur-xl backdrop-saturate-150">
        {ITEMS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-2 text-[10px] transition-colors active:bg-ivory/70",
              isActive(href) ? "text-accent" : "text-muted",
            )}
          >
            <Icon size={22} />
            {label}
            {href === "/notifications" && unreadCount > 0 && (
              <span className="absolute top-0.5 right-[22%] flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white ring-2 ring-surface">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
