/**
 * Spotify Web API (Client Credentials flow — server-to-server, no user
 * login). Used by Announcements: artist search (with photo + follower count
 * for disambiguation) and release checking.
 */
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Read lazily (not at module top-level) so this works regardless of
  // whether env vars are injected by the runtime (Next.js, GitHub Actions)
  // or loaded via dotenv in a standalone script — ES module imports are
  // evaluated before the importing file's own top-level statements, so a
  // module-level read here could run before a script's dotenv.config() call.
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in environment");
  }
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Spotify auth failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

async function spotifyFetch<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Spotify API error: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

export type SpotifyArtistResult = {
  id: string;
  name: string;
  imageUrl: string | null;
  followers: number;
  genres: string[];
  popularity: number;
  externalUrl: string | null;
};

type RawArtist = {
  id: string;
  name: string;
  popularity: number;
  genres: string[];
  followers: { total: number };
  images: { url: string }[];
  external_urls?: { spotify?: string };
};

export async function searchArtists(query: string, limit = 8): Promise<SpotifyArtistResult[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const data = await spotifyFetch<{ artists: { items: RawArtist[] } }>(
      `/search?q=${encodeURIComponent(q)}&type=artist&limit=${limit}`,
    );
    return data.artists.items.map((a) => ({
      id: a.id,
      name: a.name,
      imageUrl: a.images[0]?.url ?? null,
      followers: a.followers?.total ?? 0,
      genres: a.genres ?? [],
      popularity: a.popularity ?? 0,
      externalUrl: a.external_urls?.spotify ?? null,
    }));
  } catch {
    return [];
  }
}

export type SpotifyAlbumResult = {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  images: { url: string }[];
};

export type SpotifyAlbumTrack = {
  id: string;
  name: string;
  uri: string;
  discNumber: number;
  trackNumber: number;
};

export type SpotifyAlbumDetails = {
  id: string;
  name: string;
  uri: string;
  spotifyUrl: string;
  albumType: string;
  releaseDate: string;
  artists: string[];
  imageUrl: string | null;
  tracks: SpotifyAlbumTrack[];
};

type RawAlbumTrack = {
  id: string;
  name: string;
  uri: string;
  disc_number: number;
  track_number: number;
};

type RawAlbum = {
  id: string;
  name: string;
  uri: string;
  album_type: string;
  release_date: string;
  external_urls: { spotify?: string };
  artists: { name: string }[];
  images: { url: string }[];
  tracks: {
    items: RawAlbumTrack[];
    next: string | null;
    offset: number;
    limit: number;
    total: number;
  };
};

/** Full album metadata used when a listener adds an album from Spicetify. */
export async function getSpotifyAlbum(albumId: string): Promise<SpotifyAlbumDetails> {
  const album = await spotifyFetch<RawAlbum>(`/albums/${encodeURIComponent(albumId)}?market=GB`);
  const tracks = [...album.tracks.items];

  while (tracks.length < album.tracks.total) {
    const page = await spotifyFetch<{
      items: RawAlbumTrack[];
      next: string | null;
    }>(
      `/albums/${encodeURIComponent(albumId)}/tracks?market=GB&limit=50&offset=${tracks.length}`,
    );
    tracks.push(...page.items);
    if (!page.next || page.items.length === 0) break;
  }

  return {
    id: album.id,
    name: album.name,
    uri: album.uri,
    spotifyUrl:
      album.external_urls.spotify ?? `https://open.spotify.com/album/${album.id}`,
    albumType: album.album_type,
    releaseDate: album.release_date,
    artists: album.artists.map((artist) => artist.name),
    imageUrl: album.images[0]?.url ?? null,
    tracks: tracks.map((track) => ({
      id: track.id,
      name: track.name,
      uri: track.uri,
      discNumber: track.disc_number,
      trackNumber: track.track_number,
    })),
  };
}

export async function getArtistAlbums(artistId: string): Promise<SpotifyAlbumResult[]> {
  // Apps in Spotify's default "Development Mode" quota reject limit > 10 on this
  // endpoint with a generic "Invalid limit" 400, even though the docs say up to
  // 50 is valid.
  const data = await spotifyFetch<{ items: SpotifyAlbumResult[] }>(
    `/artists/${artistId}/albums?include_groups=album,single&market=US&limit=10`,
  );
  return data.items;
}
