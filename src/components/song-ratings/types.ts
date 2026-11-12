import type { ReplayValue, SongWithMyRating } from "@/lib/types";

export type SpotifySong = {
  id: string;
  title: string;
  artist: string;
  albumId: string;
  albumTitle: string;
  releaseDate: string | null;
  coverUrl: string | null;
  spotifyUrl: string;
  durationMs: number;
};

export type EditableSong = {
  songId: string | null;
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

export type RemovedSong = {
  song: EditableSong;
  index: number;
};

export type RemovalNotice =
  | { kind: "removed"; removed: RemovedSong }
  | { kind: "restored"; title: string }
  | { kind: "error"; message: string };

export const REPLAY_VALUES: ReplayValue[] = ["Low", "Medium", "High", "Very High"];

export function fromRating(item: SongWithMyRating): EditableSong {
  return {
    songId: item.id,
    spotifyTrackId: item.spotify_track_id,
    title: item.title,
    artist: item.artist,
    albumTitle: item.album_title,
    coverUrl: item.cover_image_url,
    spotifyUrl: item.spotify_url,
    rating: Number(item.my_rating.rating),
    replayValue: item.my_rating.replay_value,
    notes: item.my_rating.notes,
  };
}

export function fromSearch(item: SpotifySong): EditableSong {
  return {
    songId: null,
    spotifyTrackId: item.id,
    title: item.title,
    artist: item.artist,
    albumTitle: item.albumTitle,
    coverUrl: item.coverUrl,
    spotifyUrl: item.spotifyUrl,
    rating: null,
    replayValue: null,
    notes: null,
  };
}
