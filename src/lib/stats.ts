/**
 * Pure aggregation helpers for the /stats page. Kept free of Supabase so they
 * can be unit tested with plain rows.
 */

export type StatsAlbumRow = {
  albumId: string;
  title: string;
  artist: string;
  genre: string | null;
  releaseYear: number | null;
  overall: number | null;
};

export type StatsTrackRow = {
  rating: number;
  replayValue: string | null;
};

export type GroupStat = {
  label: string;
  count: number;
  average: number;
};

export type Bucket = { label: string; value: number };

export type RatingStats = {
  albumCount: number;
  scoredAlbumCount: number;
  trackCount: number;
  albumAverage: number | null;
  trackAverage: number | null;
  trackMedian: number | null;
  albumDistribution: Bucket[];
  trackDistribution: Bucket[];
  byGenre: GroupStat[];
  byDecade: GroupStat[];
  topArtists: GroupStat[];
  replayValues: Bucket[];
  best: StatsAlbumRow[];
  worst: StatsAlbumRow[];
};

const REPLAY_ORDER = ["Very High", "High", "Medium", "Low"];

function mean(values: number[]): number | null {
  return values.length
    ? values.reduce((sum, v) => sum + v, 0) / values.length
    : null;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Whole-point buckets from 10 down to "< 5", highest first. */
export function scoreBuckets(scores: number[]): Bucket[] {
  const buckets: Bucket[] = [];
  for (let floor = 9; floor >= 5; floor--) {
    buckets.push({
      label: floor === 9 ? "9–10" : `${floor}–${floor + 1}`,
      value: scores.filter((s) =>
        floor === 9 ? s >= 9 : s >= floor && s < floor + 1,
      ).length,
    });
  }
  buckets.push({ label: "< 5", value: scores.filter((s) => s < 5).length });
  return buckets;
}

export function decadeLabel(year: number | null): string | null {
  if (year == null || !Number.isFinite(year)) return null;
  return `${Math.floor(year / 10) * 10}s`;
}

/** Group scored albums by a key and average their overall scores. */
export function groupAverages(
  rows: StatsAlbumRow[],
  keyOf: (row: StatsAlbumRow) => string | null,
): GroupStat[] {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key || row.overall == null) continue;
    const list = groups.get(key) ?? [];
    list.push(row.overall);
    groups.set(key, list);
  }
  return Array.from(groups, ([label, scores]) => ({
    label,
    count: scores.length,
    average: mean(scores)!,
  }));
}

export function computeRatingStats(
  albums: StatsAlbumRow[],
  tracks: StatsTrackRow[],
): RatingStats {
  const scored = albums.filter(
    (a): a is StatsAlbumRow & { overall: number } => a.overall != null,
  );
  const albumScores = scored.map((a) => a.overall);
  const trackScores = tracks
    .map((t) => t.rating)
    .filter((n) => Number.isFinite(n));

  const byCountThenAverage = (a: GroupStat, b: GroupStat) =>
    b.count - a.count || b.average - a.average;

  const replayCounts = new Map<string, number>();
  for (const t of tracks) {
    if (t.replayValue)
      replayCounts.set(t.replayValue, (replayCounts.get(t.replayValue) ?? 0) + 1);
  }

  const ranked = [...scored].sort(
    (a, b) => b.overall - a.overall || a.title.localeCompare(b.title),
  );

  return {
    albumCount: albums.length,
    scoredAlbumCount: scored.length,
    trackCount: trackScores.length,
    albumAverage: mean(albumScores),
    trackAverage: mean(trackScores),
    trackMedian: median(trackScores),
    albumDistribution: scoreBuckets(albumScores),
    trackDistribution: scoreBuckets(trackScores),
    byGenre: groupAverages(scored, (a) => a.genre).sort(byCountThenAverage),
    byDecade: groupAverages(scored, (a) => decadeLabel(a.releaseYear)).sort(
      (a, b) => b.label.localeCompare(a.label),
    ),
    topArtists: groupAverages(scored, (a) => a.artist)
      .sort(byCountThenAverage)
      .slice(0, 8),
    replayValues: REPLAY_ORDER.map((label) => ({
      label,
      value: replayCounts.get(label) ?? 0,
    })),
    best: ranked.slice(0, 5),
    // Only show a "lowest" list once there's enough to not just mirror "best".
    worst: ranked.length > 5 ? ranked.slice(-5).reverse() : [],
  };
}
