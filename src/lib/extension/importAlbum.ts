import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { normalizeTrustedCoverUrl } from "@/lib/coverUrl";
import { extractColors } from "@/lib/palette";
import { getSpotifyAlbum, type SpotifyAlbumDetails } from "@/lib/spotify";

type AdminClient = ReturnType<typeof createAdminClient>;

function normalizeIdentity(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameTrackList(
  existing: { name: string; track_order: number }[],
  spotify: SpotifyAlbumDetails["tracks"],
): boolean {
  if (existing.length !== spotify.length) return false;
  const ordered = [...existing].sort((a, b) => a.track_order - b.track_order);
  return ordered.every(
    (track, index) => normalizeIdentity(track.name) === normalizeIdentity(spotify[index].name),
  );
}

async function findExactExistingAlbum(admin: AdminClient, spotify: SpotifyAlbumDetails) {
  const year = Number(spotify.releaseDate.slice(0, 4));
  const { data } = await admin
    .from("albums")
    .select("id, title, artist, release_year, tracks(id, name, track_order)")
    .eq("release_year", Number.isFinite(year) ? year : 0)
    .limit(100);

  const title = normalizeIdentity(spotify.name);
  const artist = normalizeIdentity(spotify.artists.join(", "));
  const matches = (data ?? []).filter((album: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
    normalizeIdentity(album.title) === title &&
    normalizeIdentity(album.artist) === artist &&
    sameTrackList(album.tracks ?? [], spotify.tracks),
  );
  return matches.length === 1 ? matches[0] : null;
}

async function createAlbumFromSpotify(
  admin: AdminClient,
  userId: string,
  spotify: SpotifyAlbumDetails,
) {
  const year = Number(spotify.releaseDate.slice(0, 4));
  const coverUrl = normalizeTrustedCoverUrl(spotify.imageUrl);
  const { data: album, error: albumError } = await admin
    .from("albums")
    .insert({
      title: spotify.name,
      artist: spotify.artists.join(", "),
      release_year: Number.isFinite(year) ? year : null,
      genre: null,
      cover_image_url: coverUrl,
      created_by: userId,
    })
    .select("id, title, artist, release_year")
    .single();
  if (albumError || !album) throw albumError ?? new Error("Could not create album");

  const { data: tracks, error: tracksError } = await admin
    .from("tracks")
    .insert(
      spotify.tracks.map((track, index) => ({
        album_id: album.id,
        name: track.name,
        track_order: index + 1,
      })),
    )
    .select("id, name, track_order")
    .order("track_order");
  if (tracksError || !tracks) throw tracksError ?? new Error("Could not create tracks");

  if (coverUrl) {
    const colors = await extractColors(coverUrl);
    if (colors) {
      await admin.from("albums").update({ cover_colors: colors }).eq("id", album.id);
    }
  }

  return { ...album, tracks };
}

async function saveMappings(
  admin: AdminClient,
  album: { id: string; tracks: { id: string; name: string; track_order: number }[] },
  spotify: SpotifyAlbumDetails,
) {
  const { error: albumMapError } = await admin.from("spotify_album_mappings").insert({
    spotify_album_id: spotify.id,
    album_id: album.id,
    spotify_url: spotify.spotifyUrl,
  });
  if (albumMapError && albumMapError.code !== "23505") throw albumMapError;

  const orderedTracks = [...album.tracks].sort((a, b) => a.track_order - b.track_order);
  const rows = spotify.tracks.map((track, index) => ({
    spotify_track_id: track.id,
    track_id: orderedTracks[index].id,
    spotify_album_id: spotify.id,
    disc_number: track.discNumber,
    track_number: track.trackNumber,
  }));
  const { error: trackMapError } = await admin
    .from("spotify_track_mappings")
    .upsert(rows, { onConflict: "spotify_track_id", ignoreDuplicates: true });
  if (trackMapError) throw trackMapError;
}

export async function importSpotifyAlbum(
  admin: AdminClient,
  userId: string,
  spotifyAlbumId: string,
) {
  const { data: existingMapping } = await admin
    .from("spotify_album_mappings")
    .select("album_id")
    .eq("spotify_album_id", spotifyAlbumId)
    .maybeSingle();
  if (existingMapping) return { albumId: existingMapping.album_id as string, created: false };

  const spotify = await getSpotifyAlbum(spotifyAlbumId);
  const exact = await findExactExistingAlbum(admin, spotify);
  const album = exact ?? (await createAlbumFromSpotify(admin, userId, spotify));
  await saveMappings(admin, album, spotify);
  return { albumId: album.id as string, created: !exact };
}
