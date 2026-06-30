import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AlbumCard } from "@/components/AlbumCard";
import { LibraryFilters } from "@/components/LibraryFilters";
import type { Album } from "@/lib/types";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    year?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: albumsData } = await supabase
    .from("albums")
    .select("*")
    .order("created_at", { ascending: false });
  const albums = (albumsData ?? []) as Album[];

  const { data: myRatings } = await supabase
    .from("ratings")
    .select("album_id, overall_rating")
    .eq("user_id", user!.id);
  const scoreMap = new Map(
    (myRatings ?? []).map((r) => [
      r.album_id as string,
      r.overall_rating != null ? Number(r.overall_rating) : null,
    ]),
  );

  const genres = Array.from(
    new Set(albums.map((a) => a.genre).filter((g): g is string => !!g)),
  ).sort();
  const years = Array.from(
    new Set(albums.map((a) => a.release_year).filter((y): y is number => y != null)),
  ).sort((a, b) => b - a);

  let list = albums;
  const q = (sp.q ?? "").toLowerCase().trim();
  if (q)
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q),
    );
  if (sp.genre) list = list.filter((a) => a.genre === sp.genre);
  if (sp.year) list = list.filter((a) => String(a.release_year) === sp.year);

  const sort = sp.sort ?? "recent";
  if (sort === "score")
    list = [...list].sort(
      (a, b) => (scoreMap.get(b.id) ?? -1) - (scoreMap.get(a.id) ?? -1),
    );
  else if (sort === "title")
    list = [...list].sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === "year")
    list = [...list].sort(
      (a, b) => (b.release_year ?? 0) - (a.release_year ?? 0),
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Library</h1>
        <span className="text-sm text-zinc-500">
          {list.length} album{list.length === 1 ? "" : "s"}
        </span>
      </div>

      <LibraryFilters genres={genres} years={years} />

      {list.length === 0 ? (
        <div className="card text-center text-sm text-zinc-400">
          {albums.length === 0 ? (
            <>
              No albums yet.{" "}
              <Link href="/album/new" className="text-violet-400 hover:underline">
                Add the first one →
              </Link>
            </>
          ) : (
            "No albums match your filters."
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((a) => (
            <AlbumCard key={a.id} album={a} myScore={scoreMap.get(a.id) ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}
