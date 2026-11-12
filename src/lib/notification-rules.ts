/** Pure rules behind the Activity → Notifications feed. */

/** Album scores this far apart (or more) count as a disagreement. */
export const DISAGREEMENT_THRESHOLD = 2;

/**
 * The signed gap (theirs − mine) when two album scores disagree enough to be
 * worth a notification, otherwise null.
 */
export function disagreementGap(
  mine: number | null | undefined,
  theirs: number | null | undefined,
  threshold = DISAGREEMENT_THRESHOLD,
): number | null {
  if (mine == null || theirs == null) return null;
  if (!Number.isFinite(mine) || !Number.isFinite(theirs)) return null;
  const gap = theirs - mine;
  return Math.abs(gap) >= threshold ? gap : null;
}

export type RawComment = {
  id: string;
  user_id: string;
  target_type: "album" | "track";
  target_id: string;
};

/**
 * Keep comments that sit on an album the viewer cares about (created or
 * rated), resolving track comments to their album first. Returns each kept
 * comment with the album it belongs to.
 */
export function relevantComments<T extends RawComment>(
  comments: T[],
  trackAlbum: Map<string, string>,
  relevantAlbumIds: Set<string>,
  me: string,
): (T & { albumId: string })[] {
  const out: (T & { albumId: string })[] = [];
  for (const c of comments) {
    if (c.user_id === me) continue;
    const albumId =
      c.target_type === "album" ? c.target_id : trackAlbum.get(c.target_id);
    if (albumId && relevantAlbumIds.has(albumId)) out.push({ ...c, albumId });
  }
  return out;
}
