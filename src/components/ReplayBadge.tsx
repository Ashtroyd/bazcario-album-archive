import { cn } from "@/lib/utils";
import type { ReplayValue } from "@/lib/types";

const STYLES: Record<ReplayValue, string> = {
  Low: "border-zinc-700 bg-zinc-800/60 text-zinc-400",
  Medium: "border-amber-800/70 bg-amber-950/40 text-amber-300",
  High: "border-lime-800/70 bg-lime-950/40 text-lime-300",
  "Very High": "border-emerald-700/70 bg-emerald-950/50 text-emerald-300",
};

export function ReplayBadge({
  value,
  className,
}: {
  value: ReplayValue | null | undefined;
  className?: string;
}) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
        STYLES[value],
        className,
      )}
    >
      {value}
    </span>
  );
}
