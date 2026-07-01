/**
 * Live album metadata via the iTunes / Apple Music Search API (no key required).
 * Called server-side only (route handlers) to avoid browser CORS restrictions.
 */
const ITUNES = "https://itunes.apple.com";

export type AlbumSuggestion = {
  id: number;
  title: string;
  artist: string;
  year: number | null;
  genre: string | null;
  coverUrl: string | null;
};

export type AlbumDetails = AlbumSuggestion & { tracks: string[] };

/** Upgrade iTunes artwork (e.g. .../100x100bb.jpg → .../600x600bb.jpg). */
function hiRes(art: string | undefined | null): string | null {
  if (!art) return null;
  return art.replace(/\/\d+x\d+bb\./, "/600x600bb.");
}

function yearOf(releaseDate: string | undefined | null): number | null {
  if (!releaseDate) return null;
  const y = Number(String(releaseDate).slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function searchAlbums(term: string): Promise<AlbumSuggestion[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const url = `${ITUNES}/search?term=${encodeURIComponent(q)}&entity=album&media=music&limit=8`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? [])
      .map((r: any) => ({
        id: r.collectionId,
        title: r.collectionName,
        artist: r.artistName,
        year: yearOf(r.releaseDate),
        genre: r.primaryGenreName ?? null,
        coverUrl: hiRes(r.artworkUrl100),
      }))
      .filter((a: AlbumSuggestion) => a.id && a.title && a.artist);
  } catch {
    return [];
  }
}

export async function getAlbumDetails(
  collectionId: number | string,
): Promise<AlbumDetails | null> {
  const url = `${ITUNES}/lookup?id=${encodeURIComponent(String(collectionId))}&entity=song&limit=200`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const results: any[] = data.results ?? [];
    const album =
      results.find((r) => r.wrapperType === "collection") ?? results[0];
    if (!album) return null;
    const tracks = results
      .filter((r) => r.wrapperType === "track")
      .sort(
        (a, b) =>
          (a.discNumber ?? 1) - (b.discNumber ?? 1) ||
          (a.trackNumber ?? 0) - (b.trackNumber ?? 0),
      )
      .map((r) => r.trackName as string)
      .filter(Boolean);
    return {
      id: album.collectionId,
      title: album.collectionName,
      artist: album.artistName,
      year: yearOf(album.releaseDate),
      genre: album.primaryGenreName ?? null,
      coverUrl: hiRes(album.artworkUrl100),
      tracks,
    };
  } catch {
    return null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
