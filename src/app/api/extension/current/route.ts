import { authenticateExtensionRequest } from "@/lib/extension/auth";
import {
  extensionJson,
  extensionOptions,
  extensionUnauthorized,
  isSpotifyId,
} from "@/lib/extension/http";
import { getExtensionTrack } from "@/lib/extension/ratings";

export function OPTIONS() {
  return extensionOptions();
}

export async function GET(request: Request) {
  const auth = await authenticateExtensionRequest(request);
  if (!auth) return extensionUnauthorized();

  const url = new URL(request.url);
  const spotifyTrackId = url.searchParams.get("spotifyTrackId");
  const spotifyAlbumId = url.searchParams.get("spotifyAlbumId");
  if (!isSpotifyId(spotifyTrackId) || !isSpotifyId(spotifyAlbumId)) {
    return extensionJson({ error: "Valid Spotify track and album IDs are required." }, { status: 400 });
  }

  const result = await getExtensionTrack(
    auth.admin,
    auth.userId,
    spotifyTrackId,
    url.origin,
  );
  if (result.status === "track_missing") {
    const { data: albumMapping } = await auth.admin
      .from("spotify_album_mappings")
      .select("album_id")
      .eq("spotify_album_id", spotifyAlbumId)
      .maybeSingle();
    return extensionJson({
      status: albumMapping ? "track_missing" : "album_missing",
    });
  }
  return extensionJson(result);
}
