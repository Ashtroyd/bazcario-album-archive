"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signout } from "@/app/actions/auth";
import { Avatar } from "@/components/Avatar";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AccountMenu({
  profile,
}: {
  profile: { display_name: string | null; avatar_url: string | null };
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutsidePress(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const name = profile.display_name?.trim() || "Your account";

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open account menu"
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen((current) => !current)}
        className="flex rounded-full ring-2 ring-line-strong transition hover:ring-accent"
      >
        <Avatar url={profile.avatar_url} name={profile.display_name} size={34} />
      </button>

      {open ? (
        <div
          id="account-menu"
          aria-label="Account"
          className="animate-account-menu-in absolute top-[calc(100%+0.65rem)] right-0 z-50 w-64 overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-[0_18px_50px_rgba(38,37,33,0.2)]"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="text-xs text-muted">Your archive and settings</p>
          </div>

          <div className="py-1.5">
            <MenuLink href="/profile" onSelect={() => setOpen(false)}>
              Profile
            </MenuLink>
            <MenuLink href="/favourites" onSelect={() => setOpen(false)}>
              Monthly favourites
            </MenuLink>
            <MenuLink href="/profile#spotify-extension" onSelect={() => setOpen(false)}>
              Spotify extension
            </MenuLink>
            <ThemeToggle variant="row" />
          </div>

          <form action={signout} className="border-t border-line pt-1.5">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-body transition-colors hover:bg-ivory hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  onSelect,
  children,
}: {
  href: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="block rounded-lg px-3 py-2 text-sm text-body transition-colors hover:bg-ivory hover:text-ink"
    >
      {children}
    </Link>
  );
}
