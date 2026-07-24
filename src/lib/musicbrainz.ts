/**
 * Small MusicBrainz lookup used to add a disambiguating stat (type, country,
 * years active) next to Spotify search results, since Spotify's API no
 * longer returns followers/genres for Developer Mode apps. Public, keyless
 * — same source coverart.ts already uses.
 */
const USER_AGENT =
  "BazcariosAlbumArchive/1.0 (https://github.com/Ashtroyd/bazcario-album-archive)";

export type ArtistMeta = {
  type: string | null; // "Group" | "Person" | ...
  country: string | null; // ISO 3166-1 alpha-2
  beginYear: string | null;
  endYear: string | null;
};

/** Best-effort: only returns data for a confident (near-exact name) match. */
export async function lookupArtistMeta(name: string): Promise<ArtistMeta | null> {
  try {
    const url = `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(`artist:"${name}"`)}&fmt=json&limit=1`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      artists?: {
        name: string;
        score?: number;
        type?: string;
        country?: string;
        "life-span"?: { begin?: string; end?: string };
      }[];
    };

    const top = data.artists?.[0];
    if (!top || (top.score ?? 0) < 90 || top.name.toLowerCase() !== name.toLowerCase()) {
      return null;
    }

    return {
      type: top.type ?? null,
      country: top.country ?? null,
      beginYear: top["life-span"]?.begin?.slice(0, 4) ?? null,
      endYear: top["life-span"]?.end?.slice(0, 4) ?? null,
    };
  } catch {
    return null;
  }
}
