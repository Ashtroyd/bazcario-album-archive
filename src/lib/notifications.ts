/* eslint-disable @typescript-eslint/no-explicit-any */
// Loosely typed around the untyped Supabase client (see lib/supabase/*).

export type NotifItem = {
  id: string;
  kind: "comment" | "compare";
  at: string;
  actor: { id: string; name: string | null; avatar: string | null };
  album: { id: string; title: string; cover: string | null } | null;
  text?: string | null;
  score?: number | null;
  unread: boolean;
};

export type FriendRequestItem = {
  id: string;
  at: string;
  requester: { id: string; name: string | null; avatar: string | null };
};

async function myLastSeen(supabase: any, me: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("last_seen_notifications")
    .eq("id", me)
    .maybeSingle();
  if (error) return null; // column may not exist yet (pre-migration)
  return data?.last_seen_notifications ?? null;
}

/** Cheap unread count for the nav bell. */
export async function getUnreadCount(supabase: any, me: string): Promise<number> {
  const { count: reqCount } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .eq("friend_id", me)
    .eq("status", "pending");

  let commentCount = 0;
  const lastSeen = await myLastSeen(supabase, me);
  if (lastSeen) {
    const { data: myAlbums } = await supabase
      .from("albums")
      .select("id")
      .eq("created_by", me);
    const albumIds = (myAlbums ?? []).map((a: { id: string }) => a.id);
    if (albumIds.length > 0) {
      const { count } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("target_type", "album")
        .in("target_id", albumIds)
        .neq("user_id", me)
        .gt("created_at", lastSeen);
      commentCount = count ?? 0;
    }
  }
  return (reqCount ?? 0) + commentCount;
}

/** Full notification data for the /notifications page. */
export async function getNotifications(
  supabase: any,
  me: string,
): Promise<{ requests: FriendRequestItem[]; items: NotifItem[] }> {
  const lastSeen = await myLastSeen(supabase, me);
  const seenTs = lastSeen ? new Date(lastSeen).getTime() : 0;

  const { data: reqRows } = await supabase
    .from("friendships")
    .select(
      "id, created_at, requester:profiles!friendships_user_id_fkey(id, display_name, avatar_url)",
    )
    .eq("friend_id", me)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const requests: FriendRequestItem[] = (reqRows ?? []).map((r: any) => ({
    id: r.id,
    at: r.created_at,
    requester: {
      id: r.requester?.id,
      name: r.requester?.display_name ?? null,
      avatar: r.requester?.avatar_url ?? null,
    },
  }));

  const items: NotifItem[] = [];

  // Comments on albums I created, left by others.
  const { data: myAlbums } = await supabase
    .from("albums")
    .select("id, title, cover_image_url")
    .eq("created_by", me);
  const myAlbumMap = new Map(
    (myAlbums ?? []).map((a: any) => [a.id as string, a]),
  );
  if (myAlbumMap.size > 0) {
    const { data: comments } = await supabase
      .from("comments")
      .select(
        "id, user_id, body, created_at, target_id, profiles(display_name, avatar_url)",
      )
      .eq("target_type", "album")
      .in("target_id", [...myAlbumMap.keys()])
      .neq("user_id", me)
      .order("created_at", { ascending: false })
      .limit(20);
    for (const c of comments ?? []) {
      const al: any = myAlbumMap.get(c.target_id);
      items.push({
        id: `c${c.id}`,
        kind: "comment",
        at: c.created_at,
        actor: {
          id: c.user_id,
          name: c.profiles?.display_name ?? null,
          avatar: c.profiles?.avatar_url ?? null,
        },
        album: al
          ? { id: al.id, title: al.title, cover: al.cover_image_url }
          : null,
        text: c.body,
        unread: new Date(c.created_at).getTime() > seenTs,
      });
    }
  }

  // Friends who rated an album I've also rated (a nudge to compare).
  const { data: myRatings } = await supabase
    .from("ratings")
    .select("album_id")
    .eq("user_id", me);
  const myRatedIds = (myRatings ?? []).map((r: any) => r.album_id as string);
  if (myRatedIds.length > 0) {
    const { data: theirRatings } = await supabase
      .from("ratings")
      .select(
        "id, user_id, overall_rating, updated_at, albums(id,title,cover_image_url), profiles(display_name, avatar_url)",
      )
      .in("album_id", myRatedIds)
      .neq("user_id", me)
      .order("updated_at", { ascending: false })
      .limit(20);
    for (const r of theirRatings ?? []) {
      if (!r.albums) continue;
      items.push({
        id: `rc${r.id}`,
        kind: "compare",
        at: r.updated_at,
        actor: {
          id: r.user_id,
          name: r.profiles?.display_name ?? null,
          avatar: r.profiles?.avatar_url ?? null,
        },
        album: {
          id: r.albums.id,
          title: r.albums.title,
          cover: r.albums.cover_image_url,
        },
        score: r.overall_rating != null ? Number(r.overall_rating) : null,
        unread: new Date(r.updated_at).getTime() > seenTs,
      });
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return { requests, items: items.slice(0, 30) };
}
