import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  AlbumCard,
  type AlbumCardRating,
} from "@/components/AlbumCard";
import type { AlbumRatingFilter } from "@/components/AlbumRatingFilters";
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
    rating?: string;
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
  const { data: friendRatingsData } = friendIds.length
    ? await supabase
        .from("ratings")
        .select(
          "album_id, user_id, overall_rating, profiles(display_name, avatar_url)",
        )
        .in("user_id", friendIds)
    : { data: [] };

  type FriendAlbumRating = {
    album_id: string;
    user_id: string;
    overall_rating: number | string | null;
    profiles: {
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  };
  const friendRatings = (friendRatingsData ?? []) as unknown as FriendAlbumRating[];
  const friendRatingsByAlbum = new Map<string, FriendAlbumRating[]>();
  const friendScoreMap = new Map<string, number>();
  const friendRatedAlbumIds = new Set<string>();
  for (const rating of friendRatings) {
    const albumRatings = friendRatingsByAlbum.get(rating.album_id) ?? [];
    albumRatings.push(rating);
    friendRatingsByAlbum.set(rating.album_id, albumRatings);

    if (rating.overall_rating != null) {
      friendRatedAlbumIds.add(rating.album_id);
      const score = Number(rating.overall_rating);
      const current = friendScoreMap.get(rating.album_id);
      if (current == null || score > current) {
        friendScoreMap.set(rating.album_id, score);
      }
    }
  }
  for (const albumRatings of friendRatingsByAlbum.values()) {
    albumRatings.sort((a, b) => {
      const aScore = a.overall_rating == null ? -1 : Number(a.overall_rating);
      const bScore = b.overall_rating == null ? -1 : Number(b.overall_rating);
      return bScore - aScore;
    });
  }
  const friendAlbumIds = new Set(friendRatingsByAlbum.keys());

  const scope: AlbumScope =
    sp.scope === "friends" || sp.scope === "all" ? sp.scope : "mine";
  const scopedAlbums =
    scope === "mine"
      ? albums.filter((album) => scoreMap.has(album.id))
      : scope === "friends"
        ? albums.filter((album) => friendAlbumIds.has(album.id))
        : albums;

  const ratingFilter: AlbumRatingFilter =
    sp.rating === "mine" ||
    sp.rating === "unrated" ||
    sp.rating === "friends"
      ? sp.rating
      : "any";
  const hasMyRating = (albumId: string) => scoreMap.get(albumId) != null;
  const ratingFilteredAlbums = scopedAlbums.filter((album) => {
    if (ratingFilter === "mine") return hasMyRating(album.id);
    if (ratingFilter === "unrated") return !hasMyRating(album.id);
    if (ratingFilter === "friends") return friendRatedAlbumIds.has(album.id);
    return true;
  });

  const genres = Array.from(
    new Set(albums.map((a) => a.genre).filter((g): g is string => !!g)),
  ).sort();
  const years = Array.from(
    new Set(albums.map((a) => a.release_year).filter((y): y is number => y != null)),
  ).sort((a, b) => b - a);

  let list = ratingFilteredAlbums;
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
    if (ratingFilter !== "any") params.set("rating", ratingFilter);
    for (const key of ["q", "genre", "year", "sort"] as const) {
      if (sp[key]) params.set(key, sp[key]!);
    }
    const query = params.toString();
    return query ? `/albums?${query}` : "/albums";
  };
  const ratingCounts: Record<AlbumRatingFilter, number> = {
    any: scopedAlbums.length,
    mine: 0,
    unrated: 0,
    friends: 0,
  };
  for (const album of scopedAlbums) {
    if (hasMyRating(album.id)) ratingCounts.mine += 1;
    else ratingCounts.unrated += 1;
    if (friendRatedAlbumIds.has(album.id)) ratingCounts.friends += 1;
  }
  const cardRating = (albumId: string): AlbumCardRating => {
    if (scope !== "friends" && scoreMap.has(albumId)) {
      return { kind: "self", score: scoreMap.get(albumId) ?? null };
    }

    const friends = friendRatingsByAlbum.get(albumId) ?? [];
    const primary = friends[0];
    if (primary) {
      return {
        kind: "friend",
        score:
          primary.overall_rating == null
            ? null
            : Number(primary.overall_rating),
        name: primary.profiles?.display_name ?? null,
        avatarUrl: primary.profiles?.avatar_url ?? null,
        additionalCount: friends.length - 1,
      };
    }

    if (scope === "mine") {
      return { kind: "self", score: null };
    }
    return { kind: "unrated" };
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Library</h1>
          <p className="text-sm text-muted">
            {list.length === scopedAlbums.length
              ? `${scopedAlbums.length} album${scopedAlbums.length === 1 ? "" : "s"}`
              : `${list.length} of ${scopedAlbums.length} albums`}
          </p>
        </div>
        <LibraryModeSwitch active="albums" />
      </div>

      <section className="space-y-4 rounded-2xl border border-line bg-paper/70 p-3 sm:p-4" aria-label="Browse albums">
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
        <LibraryFilters
          genres={genres}
          years={years}
          scope={scope}
          current={{
            q: sp.q,
            genre: sp.genre,
            year: sp.year,
            sort: sp.sort,
            rating: ratingFilter,
          }}
          ratingCounts={ratingCounts}
        />
      </section>

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
          key={`${scope}-${ratingFilter}`}
          className="animate-scope-in grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        >
          {list.map((a) => (
            <AlbumCard key={a.id} album={a} rating={cardRating(a.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
