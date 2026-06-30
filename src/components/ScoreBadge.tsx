import { cn, formatScore, scoreColor } from "@/lib/utils";

export function ScoreBadge({
  score,
  className,
}: {
  score: number | null | undefined;
  className?: string;
}) {
  return (
    <span className={cn("font-semibold tabular-nums", scoreColor(score), className)}>
      {formatScore(score)}
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-3">
      <ScoreBadge score={score} className="text-3xl" />
      <span className="mt-0.5 text-[10px] tracking-wide text-zinc-500 uppercase">
        {label}
      </span>
    </div>
  );
}
