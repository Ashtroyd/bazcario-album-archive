import { authenticateExtensionRequest } from "@/lib/extension/auth";
import {
  extensionJson,
  extensionOptions,
  extensionUnauthorized,
  isSpotifyId,
} from "@/lib/extension/http";
import {
  getExtensionTrack,
  parseExtensionRatingInput,
  saveExtensionTrackRating,
} from "@/lib/extension/ratings";

export function OPTIONS() {
  return extensionOptions();
}

export async function PUT(request: Request) {
  const auth = await authenticateExtensionRequest(request);
  if (!auth) return extensionUnauthorized();

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const spotifyTrackId = body?.spotifyTrackId;
  const parsed = parseExtensionRatingInput(body);
  if (!isSpotifyId(spotifyTrackId) || !parsed) {
    return extensionJson({ error: "The rating request is invalid." }, { status: 400 });
  }

  try {
    const trackId = await saveExtensionTrackRating(
      auth.admin,
      auth.userId,
      spotifyTrackId,
      parsed,
    );
    if (!trackId) {
      return extensionJson({ error: "This Spotify track is not linked yet." }, { status: 404 });
    }
    const result = await getExtensionTrack(
      auth.admin,
      auth.userId,
      spotifyTrackId,
      new URL(request.url).origin,
    );
    return extensionJson(result);
  } catch (error) {
    console.error("Spicetify rating save failed", error);
    return extensionJson({ error: "Album Archive could not save this rating." }, { status: 500 });
  }
}
