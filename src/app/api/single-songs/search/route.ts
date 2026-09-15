import { createClient } from "@/lib/supabase/server";
import { searchTracks } from "@/lib/spotify";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to search songs." }, { status: 401 });

  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (query.trim().length < 2) return Response.json({ results: [] });

  try {
    return Response.json({ results: await searchTracks(query) });
  } catch (error) {
    console.error("Spotify song search failed", error);
    return Response.json({ error: "Song search is unavailable right now." }, { status: 502 });
  }
}
