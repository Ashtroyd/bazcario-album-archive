export type TasteMatch = {
  /** 0–100 alignment, or null when there isn't enough overlap. */
  matchPct: number | null;
  sharedTracks: number;
};

/**
 * Compare two people's per-track ratings and return how closely they align.
 * 100% = identical scores on every shared track; lower as they diverge.
 */
export function computeTasteMatch(
  mine: Map<string, number>,
  theirs: Map<string, number>,
): TasteMatch {
  let sum = 0;
  let n = 0;
  for (const [trackId, myScore] of mine) {
    const their = theirs.get(trackId);
    if (their == null) continue;
    sum += Math.abs(myScore - their);
    n += 1;
  }
  if (n === 0) return { matchPct: null, sharedTracks: 0 };
  const avgDiff = sum / n;
  return { matchPct: Math.round(100 * (1 - avgDiff / 10)), sharedTracks: n };
}

/** Tailwind text color for a taste-match %. */
export function matchColor(pct: number | null): string {
  if (pct == null) return "text-zinc-400";
  if (pct >= 90) return "text-emerald-400";
  if (pct >= 75) return "text-lime-400";
  if (pct >= 60) return "text-amber-400";
  return "text-orange-400";
}
