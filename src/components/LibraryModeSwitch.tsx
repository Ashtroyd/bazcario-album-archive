import Link from "next/link";
import { cn } from "@/lib/utils";

export function LibraryModeSwitch({ active }: { active: "albums" | "songs" }) {
  return (
    <nav
      aria-label="Library type"
      className="inline-flex rounded-full border border-line bg-surface p-1 shadow-[0_1px_2px_rgba(38,37,33,0.05)]"
    >
      <Link
        href="/albums"
        aria-current={active === "albums" ? "page" : undefined}
        className={cn(
          "rounded-full px-4 py-1.5 text-sm transition-colors",
          active === "albums" ? "bg-ink text-paper" : "text-muted hover:text-ink",
        )}
      >
        Albums
      </Link>
      <Link
        href="/songs"
        aria-current={active === "songs" ? "page" : undefined}
        className={cn(
          "rounded-full px-4 py-1.5 text-sm transition-colors",
          active === "songs" ? "bg-ink text-paper" : "text-muted hover:text-ink",
        )}
      >
        Songs
      </Link>
    </nav>
  );
}
