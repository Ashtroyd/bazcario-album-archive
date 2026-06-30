/**
 * Cover art lookup via MusicBrainz + the Cover Art Archive (no API key).
 * MusicBrainz asks for a descriptive User-Agent and ~1 request/second; this is
 * only called on-demand when creating an album, so we stay well under that.
 */
const USER_AGENT =
  "BazcariosAlbumArchive/1.0 (https://github.com/Ashtroyd/sandbox)";

type ReleaseGroup = { id: string; score?: number };

export async function fetchCoverArt(
  title: string,
  artist: string,
): Promise<string | null> {
  if (!title.trim() || !artist.trim()) return null;
  try {
    const query = `release-group:"${title}" AND artist:"${artist}"`;
    const url =
      `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(query)}` +
      `&fmt=json&limit=5`;

    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { "release-groups"?: ReleaseGroup[] };
    const groups = (data["release-groups"] ?? []).sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0),
    );

    for (const g of groups) {
      const caa = `https://coverartarchive.org/release-group/${g.id}/front-500`;
      const head = await fetch(caa, {
        method: "HEAD",
        redirect: "follow",
        next: { revalidate: 86400 },
      });
      if (head.ok) return head.url || caa;
    }
    return null;
  } catch {
    return null;
  }
}
