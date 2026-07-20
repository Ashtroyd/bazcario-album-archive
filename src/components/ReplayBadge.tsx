import { cn } from "@/lib/utils";
import type { ReplayValue } from "@/lib/types";

const STYLES: Record<ReplayValue, string> = {
  Low: "border-line bg-ivory text-muted",
  Medium: "border-star/40 bg-star/10 text-star",
  High: "border-sage/40 bg-sage-soft text-sage",
  "Very High": "border-sage/60 bg-sage-soft text-sage",
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
