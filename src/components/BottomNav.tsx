"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
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

type Rect = { left: number; width: number };

/**
 * Mobile-only floating glass capsule tab bar. Supports iOS-style
 * press-and-hold-and-drag: touch down anywhere on the bar and a glass
 * pill tracks your finger, snapping between tabs, and lifts to navigate
 * wherever it lands — a normal tap still navigates instantly.
 */
export function BottomNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const draggingRef = useRef(false);
  // Mirrors dragHref synchronously so endDrag reads the live value even
  // when pointerup lands in the same batch as the last pointermove.
  const dragHrefRef = useRef<string | null>(null);

  const [dragHref, setDragHref] = useState<string | null>(null);
  const [dragRect, setDragRect] = useState<Rect | null>(null);
  const [dragVisible, setDragVisible] = useState(false);

  function rectFor(href: string): Rect | null {
    const el = itemRefs.current.get(href);
    const container = containerRef.current;
    if (!el || !container) return null;
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return { left: elRect.left - containerRect.left, width: elRect.width };
  }

  function hrefAtX(clientX: number): string | null {
    let closest: string | null = null;
    let closestDist = Infinity;
    for (const item of ITEMS) {
      const el = itemRefs.current.get(item.href);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const dist = Math.abs(clientX - (r.left + r.width / 2));
      if (dist < closestDist) {
        closestDist = dist;
        closest = item.href;
      }
    }
    return closest;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLAnchorElement>, href: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    draggingRef.current = true;
    dragHrefRef.current = href;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragHref(href);
    setDragRect(rectFor(href));
    setDragVisible(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const href = hrefAtX(e.clientX);
    if (href && href !== dragHrefRef.current) {
      dragHrefRef.current = href;
      setDragHref(href);
      setDragRect(rectFor(href));
    }
  }

  function endDrag() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const landed = dragHrefRef.current;
    dragHrefRef.current = null;
    if (landed && landed !== pathname) router.push(landed);
    setDragVisible(false);
    // Let the fade-out transition finish before dropping the pill's
    // position, otherwise it snaps back to its last spot mid-fade.
    window.setTimeout(() => {
      setDragRect(null);
      setDragHref(null);
    }, 150);
  }

  return (
    <nav
      className="fixed inset-x-3 z-30 sm:hidden"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div
        ref={containerRef}
        className="relative mx-auto flex max-w-sm touch-none items-stretch justify-around rounded-full border border-line/70 bg-surface/75 px-1.5 py-1.5 shadow-[0_10px_30px_rgba(38,37,33,0.22)] backdrop-blur-xl backdrop-saturate-150"
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {dragRect && (
          <div
            className="pointer-events-none absolute inset-y-1.5 rounded-full bg-ivory/85 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_2px_10px_rgba(0,0,0,0.18)] backdrop-blur-md transition-[left,width,opacity] duration-200 ease-out"
            style={{
              left: dragRect.left,
              width: dragRect.width,
              opacity: dragVisible ? 1 : 0,
            }}
          />
        )}

        {ITEMS.map(({ href, label, Icon }) => (
          <a
            key={href}
            ref={(el) => {
              if (el) itemRefs.current.set(href, el);
            }}
            href={href}
            aria-label={label}
            onPointerDown={(e) => handlePointerDown(e, href)}
            onClick={(e) => {
              e.preventDefault();
              if (href !== pathname) router.push(href);
            }}
            className={cn(
              "relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-2 text-[10px] transition-colors",
              (dragHref ?? (isActive(href) ? href : null)) === href
                ? "text-accent"
                : "text-muted",
            )}
          >
            <Icon size={22} />
            {label}
            {href === "/notifications" && unreadCount > 0 && (
              <span className="absolute top-0.5 right-[22%] flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white ring-2 ring-surface">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </a>
        ))}
      </div>
    </nav>
  );
}
