import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AlbumCard } from "@/components/AlbumCard";
import { AlbumScopeTabs, type AlbumScope } from "@/components/AlbumScopeTabs";
import { LibraryFilters } from "@/components/LibraryFilters";
import { LibraryModeSwitch } from "@/components/LibraryModeSwitch";
import type { Album } from "@/lib/types";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    year?: string;
    sort?: string;
    scope?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [albumsResult, myRatingsResult, friendshipsResult] = await Promise.all([
    supabase.from("albums").select("*").order("created_at", { ascending: false }),
    supabase
      .from("ratings")
      .select("album_id, overall_rating")
      .eq("user_id", user!.id),
    supabase
      .from("friendships")
      .select("user_id, friend_id")
      .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
      .eq("status", "accepted"),
  ]);

  const albumsData = albumsResult.data;
  const albums = (albumsData ?? []) as Album[];
  const myRatings = myRatingsResult.data;
  const scoreMap = new Map(
    (myRatings ?? []).map((r) => [
      r.album_id as string,
      r.overall_rating != null ? Number(r.overall_rating) : null,
    ]),
  );

  const friendIds = Array.from(
    new Set(
      (friendshipsResult.data ?? []).map((friendship) =>
        friendship.user_id === user!.id
          ? friendship.friend_id
          : friendship.user_id,
      ) as string[],
    ),
  );
  const { data: friendRatings } = friendIds.length
    ? await supabase
        .from("ratings")
        .select("album_id, overall_rating")
        .in("user_id", friendIds)
    : { data: [] };
  const friendAlbumIds = new Set(
    (friendRatings ?? []).map((rating) => rating.album_id as string),
  );
  const friendScoreMap = new Map<string, number>();
  for (const rating of friendRatings ?? []) {
    if (rating.overall_rating == null) continue;
    const score = Number(rating.overall_rating);
    const current = friendScoreMap.get(rating.album_id as string);
    if (current == null || score > current) friendScoreMap.set(rating.album_id as string, score);
  }

  const scope: AlbumScope =
    sp.scope === "friends" || sp.scope === "all" ? sp.scope : "mine";
  const scopedAlbums =
    scope === "mine"
      ? albums.filter((album) => scoreMap.has(album.id))
      : scope === "friends"
        ? albums.filter((album) => friendAlbumIds.has(album.id))
        : albums;

  const genres = Array.from(
    new Set(albums.map((a) => a.genre).filter((g): g is string => !!g)),
  ).sort();
  const years = Array.from(
    new Set(albums.map((a) => a.release_year).filter((y): y is number => y != null)),
  ).sort((a, b) => b - a);

  let list = scopedAlbums;
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
    list = [...list].sort((a, b) => {
      const scores = scope === "friends" ? friendScoreMap : scoreMap;
      return (scores.get(b.id) ?? -1) - (scores.get(a.id) ?? -1);
    });
  else if (sort === "title")
    list = [...list].sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === "year")
    list = [...list].sort(
      (a, b) => (b.release_year ?? 0) - (a.release_year ?? 0),
    );

  const scopeCopy: Record<AlbumScope, string> = {
    mine: "Albums you’ve started rating. Every score and note here belongs to your account.",
    friends: "Albums your friends have started rating. Their scores never change yours.",
    all: "The shared album catalog. Appearing here doesn’t mean you’ve rated it.",
  };
  const counts: Record<AlbumScope, number> = {
    mine: scoreMap.size,
    friends: friendAlbumIds.size,
    all: albums.length,
  };
  const scopeHref = (nextScope: AlbumScope) => {
    const params = new URLSearchParams();
    if (nextScope !== "mine") params.set("scope", nextScope);
    for (const key of ["q", "genre", "year", "sort"] as const) {
      if (sp[key]) params.set(key, sp[key]!);
    }
    const query = params.toString();
    return query ? `/albums?${query}` : "/albums";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Albums</h1>
          <p className="text-sm text-muted">
            {list.length === scopedAlbums.length
              ? `${scopedAlbums.length} album${scopedAlbums.length === 1 ? "" : "s"}`
              : `${list.length} of ${scopedAlbums.length} albums`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/album/new" className="btn btn-primary px-3 py-1.5">
            Add album
          </Link>
          <LibraryModeSwitch active="albums" />
        </div>
      </div>

      <div className="space-y-2">
        <AlbumScopeTabs
          active={scope}
          counts={counts}
          hrefs={{
            mine: scopeHref("mine"),
            friends: scopeHref("friends"),
            all: scopeHref("all"),
          }}
        />
        <p className="max-w-2xl text-sm text-muted">{scopeCopy[scope]}</p>
      </div>

      <LibraryFilters genres={genres} years={years} scope={scope} />

      {list.length === 0 ? (
        <div className="card text-center text-sm text-muted">
          {scopedAlbums.length === 0 ? (
            <>
              {scope === "mine" ? (
                <>
                  You haven&apos;t rated an album yet. Pick one from{" "}
                  <Link
                    href="/albums?scope=all"
                    className="text-accent hover:underline"
                  >
                    All albums →
                  </Link>
                </>
              ) : scope === "friends" ? (
                <>
                  No friend ratings yet.{" "}
                  <Link
                    href="/friends"
                    className="text-accent hover:underline"
                  >
                    Find friends →
                  </Link>
                </>
              ) : (
                <>
                  No albums yet.{" "}
                  <Link
                    href="/album/new"
                    className="text-accent hover:underline"
                  >
                    Add the first one →
                  </Link>
                </>
              )}
            </>
          ) : (
            "No albums match your filters."
          )}
        </div>
      ) : (
        <div
          key={scope}
          className="animate-scope-in grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        >
          {list.map((a) => (
            <AlbumCard key={a.id} album={a} myScore={scoreMap.get(a.id) ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}
