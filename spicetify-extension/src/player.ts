export type PlayingTrack = {
  spotifyTrackId: string;
  spotifyAlbumId: string;
  trackName: string;
  albumName: string;
  artistName: string;
  imageUrl: string | null;
};

function spotifyId(uri: unknown, kind: "track" | "album"): string | null {
  if (typeof uri !== "string") return null;
  const match = uri.match(new RegExp(`^spotify:${kind}:([A-Za-z0-9]{22})$`));
  return match?.[1] ?? null;
}

export function readPlayingTrack(): PlayingTrack | null {
  const item = Spicetify.Player.data?.item;
  if (!item || item.type !== "track" || item.metadata?.is_local === "true") return null;

  const spotifyTrackId = spotifyId(item.uri, "track");
  const spotifyAlbumId = spotifyId(item.metadata?.album_uri, "album");
  if (!spotifyTrackId || !spotifyAlbumId) return null;

  return {
    spotifyTrackId,
    spotifyAlbumId,
    trackName: item.name ?? item.metadata?.title ?? "Current track",
    albumName: item.album?.name ?? item.metadata?.album_title ?? "",
    artistName:
      item.artists?.map((artist: { name?: string }) => artist.name).filter(Boolean).join(", ") ??
      item.metadata?.artist_name ??
      "",
    imageUrl:
      item.images?.[0]?.url ??
      item.metadata?.image_xlarge_url ??
      item.metadata?.image_large_url ??
      null,
  };
}
