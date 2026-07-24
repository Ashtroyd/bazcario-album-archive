/**
 * Artist search + release history via the MusicBrainz API (no API key,
 * same source as coverart.ts). MusicBrainz asks for a descriptive
 * User-Agent and ~1 request/second.
 */
const USER_AGENT =
  "BazcariosAlbumArchive/1.0 (https://github.com/Ashtroyd/bazcario-album-archive)";

export type ArtistResult = {
  mbid: string;
  name: string;
  disambiguation: string | null;
};

export async function searchArtists(query: string, limit = 8): Promise<ArtistResult[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const url = `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(q)}&fmt=json&limit=${limit}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      artists?: { id: string; name: string; disambiguation?: string }[];
    };

    return (data.artists ?? []).map((a) => ({
      mbid: a.id,
      name: a.name,
      disambiguation: a.disambiguation || null,
    }));
  } catch {
    return [];
  }
}

export type ReleaseGroupResult = {
  id: string;
  title: string;
  primaryType: string | null;
  secondaryTypes: string[];
  firstReleaseDate: string | null;
};

/** All release groups (albums/EPs/singles/etc.) MusicBrainz has for an artist. */
export async function getArtistReleaseGroups(mbid: string): Promise<ReleaseGroupResult[]> {
  const results: ReleaseGroupResult[] = [];
  let offset = 0;

  for (;;) {
    const url = `https://musicbrainz.org/ws/2/release-group?artist=${mbid}&fmt=json&limit=100&offset=${offset}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
    if (!res.ok) break;

    const data = (await res.json()) as {
      "release-groups"?: {
        id: string;
        title: string;
        "primary-type"?: string;
        "secondary-types"?: string[];
        "first-release-date"?: string;
      }[];
      "release-group-count"?: number;
    };

    const groups = data["release-groups"] ?? [];
    for (const g of groups) {
      results.push({
        id: g.id,
        title: g.title,
        primaryType: g["primary-type"] ?? null,
        secondaryTypes: g["secondary-types"] ?? [],
        firstReleaseDate: g["first-release-date"] || null,
      });
    }

    offset += groups.length;
    const total = data["release-group-count"] ?? groups.length;
    if (groups.length === 0 || offset >= total) break;

    await new Promise((r) => setTimeout(r, 1000));
  }

  return results;
}

export async function getReleaseGroupCoverUrl(releaseGroupId: string): Promise<string | null> {
  try {
    const url = `https://coverartarchive.org/release-group/${releaseGroupId}/front-500`;
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.ok ? res.url || url : null;
  } catch {
    return null;
  }
}
