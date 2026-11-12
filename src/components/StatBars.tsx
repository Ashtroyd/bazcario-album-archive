import { cn } from "@/lib/utils";

/** Simple horizontal bar chart for small labelled counts. */
export function StatBars({
  data,
  colorClass = "bg-accent",
  labelWidth = "w-14",
  format = (n) => String(n),
}: {
  data: { label: string; value: number }[];
  colorClass?: string;
  labelWidth?: string;
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span
            className={cn("shrink-0 truncate text-right text-muted", labelWidth)}
            title={d.label}
          >
            {d.label}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-ivory">
            <div
              className={cn("h-full rounded", colorClass)}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-muted">{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}
