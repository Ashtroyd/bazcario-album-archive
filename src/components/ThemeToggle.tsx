"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "@/components/icons";

const THEME_KEY = "bazcario:theme";
type Theme = "light" | "dark";

/**
 * Dark-mode toggle. The pre-paint script in the root layout sets
 * `data-theme` before React runs; here we read it back on mount, then flip
 * both the attribute and the persisted preference on click.
 */
export function ThemeToggle({
  variant = "icon",
  onToggled,
}: {
  /** "icon" for the nav bar, "row" for a labelled item inside a menu. */
  variant?: "icon" | "row";
  onToggled?: () => void;
} = {}) {
  // Default "light" matches the SSR/first-client render, so no hydration
  // mismatch; the real value is read from the DOM once mounted.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Intentionally sync from the DOM *after* mount: the pre-paint script may
    // have set data-theme to "dark", but SSR/first render is "light". Reading
    // it here (not in a lazy initializer) keeps hydration markup matching.
    const current = document.documentElement.getAttribute("data-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (current === "dark" || current === "light") setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore — storage may be unavailable
    }
    onToggled?.();
  }

  const isDark = theme === "dark";

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-body transition-colors hover:bg-ivory hover:text-ink"
      >
        {isDark ? (
          <IconSun className="h-4 w-4 text-muted" />
        ) : (
          <IconMoon className="h-4 w-4 text-muted" />
        )}
        {isDark ? "Light mode" : "Dark mode"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle dark mode"
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-ivory hover:text-ink"
    >
      <span className="transition-transform duration-200 ease-out">
        {isDark ? (
          <IconMoon className="h-[18px] w-[18px]" />
        ) : (
          <IconSun className="h-[18px] w-[18px]" />
        )}
      </span>
    </button>
  );
}
