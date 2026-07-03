"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/albums", label: "Library", icon: "💿" },
  { href: "/album/new", label: "Add", icon: "➕" },
  { href: "/friends", label: "Friends", icon: "👥" },
  { href: "/notifications", label: "Alerts", icon: "🔔" },
];

/** Mobile-only bottom tab bar (top bar keeps profile + logo on phones). */
export function BottomNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <div className="flex items-stretch justify-around">
        {ITEMS.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition active:bg-zinc-800/50",
              isActive(it.href) ? "text-violet-400" : "text-zinc-400",
            )}
          >
            <span className="text-xl leading-none">{it.icon}</span>
            {it.label}
            {it.href === "/notifications" && unreadCount > 0 && (
              <span className="absolute top-1 right-[24%] flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
