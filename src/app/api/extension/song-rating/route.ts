import { authenticateExtensionRequest } from "@/lib/extension/auth";
import {
  extensionJson,
  extensionOptions,
  extensionUnauthorized,
  isSpotifyId,
} from "@/lib/extension/http";
import { parseExtensionRatingInput } from "@/lib/extension/ratings";
import {
  getExtensionSongRating,
  saveExtensionSongRating,
} from "@/lib/extension/songRatings";

export function OPTIONS() {
  return extensionOptions();
}

export async function GET(request: Request) {
  const auth = await authenticateExtensionRequest(request);
  if (!auth) return extensionUnauthorized();

  const spotifyTrackId = new URL(request.url).searchParams.get("spotifyTrackId");
  if (!isSpotifyId(spotifyTrackId)) {
    return extensionJson({ error: "A valid Spotify track ID is required." }, { status: 400 });
  }

  return extensionJson(
    await getExtensionSongRating(auth.admin, auth.userId, spotifyTrackId),
  );
}

export async function PUT(request: Request) {
  const auth = await authenticateExtensionRequest(request);
  if (!auth) return extensionUnauthorized();

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const spotifyTrackId = body?.spotifyTrackId;
  const parsed = parseExtensionRatingInput(body);
  if (!isSpotifyId(spotifyTrackId) || !parsed) {
    return extensionJson({ error: "The song rating request is invalid." }, { status: 400 });
  }

  try {
    return extensionJson(
      await saveExtensionSongRating(auth.admin, auth.userId, spotifyTrackId, parsed),
    );
  } catch (error) {
    console.error("Spicetify standalone song rating save failed", error);
    return extensionJson({ error: "Album Archive could not save this song rating." }, { status: 500 });
  }
}
