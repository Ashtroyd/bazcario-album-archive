import { cn, formatScore, scoreColor } from "@/lib/utils";

export function ScoreBadge({
  score,
  className,
}: {
  score: number | null | undefined;
  className?: string;
}) {
  const isRated = score !== null && score !== undefined && !Number.isNaN(score);
  return (
    <span className={cn("font-semibold tabular-nums", scoreColor(score), className)}>
      {isRated ? formatScore(score) : "Not rated"}
    </span>
  );
}

/** Larger circular overall-score display. */
export function ScoreCircle({
  score,
  label = "Overall",
}: {
  score: number | null | undefined;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface px-5 py-3 shadow-[0_1px_2px_rgba(38,37,33,0.06)]">
      <ScoreBadge score={score} className={score == null ? "text-sm" : "text-3xl"} />
      <span className="mt-0.5 text-[10px] tracking-wide text-muted uppercase">
        {label}
      </span>
    </div>
  );
}
