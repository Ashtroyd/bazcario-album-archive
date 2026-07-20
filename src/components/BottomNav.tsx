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

/** Mobile-only bottom tab bar (top bar keeps profile + logo on phones). */
export function BottomNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <div className="flex items-stretch justify-around">
        {ITEMS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-2 text-[10px] transition active:bg-ivory",
              isActive(href) ? "text-accent" : "text-muted",
            )}
          >
            <Icon size={22} />
            {label}
            {href === "/notifications" && unreadCount > 0 && (
              <span className="absolute top-1 right-[24%] flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
