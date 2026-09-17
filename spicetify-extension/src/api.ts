import type { ExtensionConfig } from "./storage";

export type ReplayValue = "Low" | "Medium" | "High" | "Very High";

export type ExtensionAccount = {
  displayName: string;
  avatarUrl: string | null;
};

export type ReadyTrack = {
  status: "ready";
  album: {
    id: string;
    title: string;
    artist: string;
    coverUrl: string | null;
    overallRating: number | null;
    archiveUrl: string;
    spotifyAlbumId: string;
  };
  track: {
    id: string;
    name: string;
    order: number;
    rating: number | null;
    replayValue: ReplayValue | null;
    notes: string | null;
  };
};

export type CurrentResponse =
  | ReadyTrack
  | { status: "album_missing" | "track_missing" };

export type ReadySong = {
  status: "ready";
  song: {
    id: string;
    spotifyTrackId: string;
    title: string;
    artist: string;
    albumTitle: string | null;
    coverUrl: string | null;
    spotifyUrl: string | null;
    rating: number | null;
    replayValue: ReplayValue | null;
    notes: string | null;
  };
};

export type SongRatingResponse = ReadySong | { status: "song_missing" };

export class ArchiveApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function archiveRequest<T>(
  config: ExtensionConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${config.siteUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new ArchiveApiError(body.error ?? "Album Archive did not respond.", response.status);
  }
  return body as T;
}

export function getCurrent(
  config: ExtensionConfig,
  spotifyAlbumId: string,
  spotifyTrackId: string,
): Promise<CurrentResponse> {
  const params = new URLSearchParams({ spotifyAlbumId, spotifyTrackId });
  return archiveRequest(config, `/api/extension/current?${params}`);
}

export function getAccount(config: ExtensionConfig): Promise<ExtensionAccount> {
  return archiveRequest(config, "/api/extension/account");
}

export function importAlbum(
  config: ExtensionConfig,
  spotifyAlbumId: string,
): Promise<{ albumId: string; created: boolean }> {
  return archiveRequest(config, "/api/extension/import", {
    method: "POST",
    body: JSON.stringify({ spotifyAlbumId }),
  });
}

export function saveRating(
  config: ExtensionConfig,
  input: {
    spotifyTrackId: string;
    rating: number | null;
    replayValue: ReplayValue | null;
    notes: string | null;
  },
): Promise<ReadyTrack> {
  return archiveRequest(config, "/api/extension/rating", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function getSongRating(
  config: ExtensionConfig,
  spotifyTrackId: string,
): Promise<SongRatingResponse> {
  const params = new URLSearchParams({ spotifyTrackId });
  return archiveRequest(config, `/api/extension/song-rating?${params}`);
}

export function saveSongRating(
  config: ExtensionConfig,
  input: {
    spotifyTrackId: string;
    rating: number | null;
    replayValue: ReplayValue | null;
    notes: string | null;
  },
): Promise<SongRatingResponse> {
  return archiveRequest(config, "/api/extension/song-rating", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
