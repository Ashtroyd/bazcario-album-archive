export type ActivityType = "rating" | "comment" | "album" | "friend";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  at: string;
  actor: { id: string; name: string | null; avatar: string | null };
  album?: { id: string; title: string; cover: string | null } | null;
  score?: number | null;
  text?: string | null;
};

/**
 * Build a unified recent-activity feed from a user's friends: ratings,
 * comments, newly-added albums, and new friendships. RLS already limits each
 * source to what the viewer is allowed to see.
 */
export async function getFriendActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  me: string,
  friendIds: string[],
): Promise<ActivityItem[]> {
  if (friendIds.length === 0) return [];
  const items: ActivityItem[] = [];

  const [{ data: ratings }, { data: albums }, { data: comments }, { data: friends }] =
    await Promise.all([
      supabase
        .from("ratings")
        .select(
          "id, user_id, overall_rating, updated_at, albums(id,title,cover_image_url), profiles(display_name, avatar_url)",
        )
        .in("user_id", friendIds)
        .order("updated_at", { ascending: false })
        .limit(15),
      supabase
        .from("albums")
        .select(
          "id, title, cover_image_url, created_at, created_by, profiles!albums_created_by_fkey(display_name, avatar_url)",
        )
        .in("created_by", friendIds)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("comments")
        .select(
          "id, user_id, body, created_at, target_id, profiles(display_name, avatar_url)",
        )
        .eq("target_type", "album")
        .in("user_id", friendIds)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("friendships")
        .select(
          "id, user_id, friend_id, created_at, requester:profiles!friendships_user_id_fkey(display_name, avatar_url), recipient:profiles!friendships_friend_id_fkey(display_name, avatar_url)",
        )
        .or(`user_id.eq.${me},friend_id.eq.${me}`)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  for (const r of ratings ?? []) {
    if (!r.albums) continue;
    items.push({
      id: `r${r.id}`,
      type: "rating",
      at: r.updated_at,
      actor: {
        id: r.user_id,
        name: r.profiles?.display_name ?? null,
        avatar: r.profiles?.avatar_url ?? null,
      },
      album: { id: r.albums.id, title: r.albums.title, cover: r.albums.cover_image_url },
      score: r.overall_rating != null ? Number(r.overall_rating) : null,
    });
  }

  for (const al of albums ?? []) {
    items.push({
      id: `a${al.id}`,
      type: "album",
      at: al.created_at,
      actor: {
        id: al.created_by,
        name: al.profiles?.display_name ?? null,
        avatar: al.profiles?.avatar_url ?? null,
      },
      album: { id: al.id, title: al.title, cover: al.cover_image_url },
    });
  }

  const commentAlbumIds = [
    ...new Set((comments ?? []).map((c: { target_id: string }) => c.target_id)),
  ];
  const albumMap = new Map<
    string,
    { id: string; title: string; cover: string | null }
  >();
  if (commentAlbumIds.length > 0) {
    const { data: cAlbums } = await supabase
      .from("albums")
      .select("id, title, cover_image_url")
      .in("id", commentAlbumIds);
    for (const a of cAlbums ?? [])
      albumMap.set(a.id, { id: a.id, title: a.title, cover: a.cover_image_url });
  }
  for (const c of comments ?? []) {
    items.push({
      id: `c${c.id}`,
      type: "comment",
      at: c.created_at,
      actor: {
        id: c.user_id,
        name: c.profiles?.display_name ?? null,
        avatar: c.profiles?.avatar_url ?? null,
      },
      album: albumMap.get(c.target_id) ?? null,
      text: c.body,
    });
  }

  for (const f of friends ?? []) {
    const otherIsRequester = f.friend_id === me;
    const other = otherIsRequester ? f.requester : f.recipient;
    items.push({
      id: `f${f.id}`,
      type: "friend",
      at: f.created_at,
      actor: {
        id: otherIsRequester ? f.user_id : f.friend_id,
        name: other?.display_name ?? null,
        avatar: other?.avatar_url ?? null,
      },
    });
  }

  items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
  return items.slice(0, 20);
}
