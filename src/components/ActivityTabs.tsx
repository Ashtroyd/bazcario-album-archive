import Link from "next/link";
import { cn } from "@/lib/utils";

export type ActivityView = "notifications" | "releases";

export function ActivityTabs({ active }: { active: ActivityView }) {
  const tabs: { href: string; label: string; value: ActivityView }[] = [
    { href: "/activity", label: "Updates", value: "notifications" },
    { href: "/activity?view=releases", label: "New releases", value: "releases" },
  ];

  return (
    <nav
      aria-label="Activity type"
      className="inline-flex rounded-full border border-line bg-surface p-1 shadow-[0_1px_2px_rgba(38,37,33,0.05)]"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          aria-current={active === tab.value ? "page" : undefined}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm transition-colors",
            active === tab.value
              ? "bg-ink text-paper"
              : "text-muted hover:text-ink",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
