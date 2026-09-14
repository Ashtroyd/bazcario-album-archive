import { authenticateExtensionRequest } from "@/lib/extension/auth";
import {
  extensionJson,
  extensionOptions,
  extensionUnauthorized,
  isSpotifyId,
} from "@/lib/extension/http";
import { importSpotifyAlbum } from "@/lib/extension/importAlbum";

export function OPTIONS() {
  return extensionOptions();
}

export async function POST(request: Request) {
  const auth = await authenticateExtensionRequest(request);
  if (!auth) return extensionUnauthorized();

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const spotifyAlbumId = body?.spotifyAlbumId;
  if (!isSpotifyId(spotifyAlbumId)) {
    return extensionJson({ error: "A valid Spotify album ID is required." }, { status: 400 });
  }

  try {
    const result = await importSpotifyAlbum(auth.admin, auth.userId, spotifyAlbumId);
    return extensionJson(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    console.error("Spicetify album import failed", error);
    return extensionJson(
      { error: "Album Archive could not add this Spotify album." },
      { status: 502 },
    );
  }
}
