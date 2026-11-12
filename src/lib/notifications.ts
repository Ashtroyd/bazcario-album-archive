/* eslint-disable @typescript-eslint/no-explicit-any */
// Loosely typed around the untyped Supabase client (see lib/supabase/*).

import {
  disagreementGap,
  relevantComments,
  type RawComment,
} from "@/lib/notification-rules";

export type NotifItem = {
  id: string;
  /**
   * comment     — someone commented on an album (or one of its tracks) you
   *               created or rated
   * compare     — a friend rated an album you've also rated
   * disagree    — …and their score is far from yours
   */
  kind: "comment" | "compare" | "disagree";
  at: string;
  actor: { id: string; name: string | null; avatar: string | null };
  album: { id: string; title: string; cover: string | null } | null;
  /** Comment body, for comment items. */
  text?: string | null;
  /** Track name, when a comment is on a specific track. */
  trackName?: string | null;
  /** Their album score, for compare/disagree items. */
  score?: number | null;
  /** Your album score, for compare/disagree items. */
  myScore?: number | null;
  unread: boolean;
};

export type FriendRequestItem = {
  id: string;
  at: string;
  requester: { id: string; name: string | null; avatar: string | null };
};

/** How many recent rows to scan per source. Keeps every query bounded. */
const SCAN_LIMIT = 50;

async function myLastSeen(supabase: any, me: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("last_seen_notifications")
    .eq("id", me)
    .maybeSingle();
  if (error) return null; // column may not exist yet (pre-migration)
  return data?.last_seen_notifications ?? null;
}

/** Albums I created plus albums I've rated, and my score on each. */
async function myAlbumContext(supabase: any, me: string) {
  const [{ data: created }, { data: rated }] = await Promise.all([
    supabase.from("albums").select("id").eq("created_by", me),
    supabase.from("ratings").select("album_id, overall_rating").eq("user_id", me),
  ]);
  const myScores = new Map<string, number | null>(
    (rated ?? []).map((r: any) => [
      r.album_id as string,
      r.overall_rating != null ? Number(r.overall_rating) : null,
    ]),
  );
  const relevant = new Set<string>([
    ...(created ?? []).map((a: any) => a.id as string),
    ...myScores.keys(),
  ]);
  return { relevant, myScores };
}

/**
 * Recent comments by others on albums I care about, including comments on
 * individual tracks. Scans the newest comments then filters in memory, so no
 * query ever carries an unbounded `in (...)` list.
 */
async function recentRelevantComments(
  supabase: any,
  me: string,
  relevant: Set<string>,
  since: string | null,
) {
  let query = supabase
    .from("comments")
    .select(
      "id, user_id, body, created_at, target_type, target_id, profiles(display_name, avatar_url)",
    )
    .in("target_type", ["album", "track"])
    .neq("user_id", me)
    .order("created_at", { ascending: false })
    .limit(SCAN_LIMIT);
  if (since) query = query.gt("created_at", since);
  const { data } = await query;
  type CommentScanRow = RawComment & {
    body: string;
    created_at: string;
    profiles: { display_name: string | null; avatar_url: string | null } | null;
  };
  const rows = (data ?? []) as CommentScanRow[];

  const trackIds = rows
    .filter((c) => c.target_type === "track")
    .map((c) => c.target_id);
  const trackInfo = new Map<string, { albumId: string; name: string }>();
  if (trackIds.length) {
    const { data: tracks } = await supabase
      .from("tracks")
      .select("id, album_id, name")
      .in("id", trackIds);
    for (const t of tracks ?? []) {
      trackInfo.set(t.id, { albumId: t.album_id, name: t.name });
    }
  }
  const trackAlbum = new Map(
    [...trackInfo].map(([id, info]) => [id, info.albumId]),
  );
  return relevantComments(rows, trackAlbum, relevant, me).map((c) => ({
    ...c,
    trackName:
      c.target_type === "track" ? trackInfo.get(c.target_id)?.name ?? null : null,
  }));
}

/** Friends' recent ratings on albums I've also rated. */
async function recentFriendRatings(
  supabase: any,
  me: string,
  myScores: Map<string, number | null>,
  since: string | null,
) {
  if (myScores.size === 0) return [];
  let query = supabase
    .from("ratings")
    .select(
      "id, user_id, album_id, overall_rating, updated_at, albums(id,title,cover_image_url), profiles(display_name, avatar_url)",
    )
    .neq("user_id", me)
    .not("overall_rating", "is", null)
    .order("updated_at", { ascending: false })
    .limit(SCAN_LIMIT);
  if (since) query = query.gt("updated_at", since);
  const { data } = await query;
  return ((data ?? []) as any[]).filter((r) => myScores.has(r.album_id));
}

/** Unread count for the nav bell. */
export async function getUnreadCount(supabase: any, me: string): Promise<number> {
  const { count: reqCount } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .eq("friend_id", me)
    .eq("status", "pending");

  const lastSeen = await myLastSeen(supabase, me);
  if (!lastSeen) return reqCount ?? 0;

  const { relevant, myScores } = await myAlbumContext(supabase, me);
  const [comments, ratings] = await Promise.all([
    recentRelevantComments(supabase, me, relevant, lastSeen),
    recentFriendRatings(supabase, me, myScores, lastSeen),
  ]);
  return (reqCount ?? 0) + comments.length + ratings.length;
}

/** Full notification data for the Activity → Notifications tab. */
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

  const { relevant, myScores } = await myAlbumContext(supabase, me);
  const [comments, ratings] = await Promise.all([
    recentRelevantComments(supabase, me, relevant, null),
    recentFriendRatings(supabase, me, myScores, null),
  ]);

  // Album details for comment items (ratings already join their album).
  const commentAlbumIds = [...new Set(comments.map((c) => c.albumId))];
  const albumMap = new Map<string, any>();
  if (commentAlbumIds.length) {
    const { data: albums } = await supabase
      .from("albums")
      .select("id, title, cover_image_url")
      .in("id", commentAlbumIds);
    for (const a of albums ?? []) albumMap.set(a.id, a);
  }

  const items: NotifItem[] = [];

  for (const c of comments) {
    const al = albumMap.get(c.albumId);
    items.push({
      id: `c${c.id}`,
      kind: "comment",
      at: c.created_at,
      actor: {
        id: c.user_id,
        name: c.profiles?.display_name ?? null,
        avatar: c.profiles?.avatar_url ?? null,
      },
      album: al ? { id: al.id, title: al.title, cover: al.cover_image_url } : null,
      text: c.body,
      trackName: c.trackName,
      unread: new Date(c.created_at).getTime() > seenTs,
    });
  }

  for (const r of ratings) {
    if (!r.albums) continue;
    const score = Number(r.overall_rating);
    const myScore = myScores.get(r.album_id) ?? null;
    items.push({
      id: `rc${r.id}`,
      kind: disagreementGap(myScore, score) != null ? "disagree" : "compare",
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
      score,
      myScore,
      unread: new Date(r.updated_at).getTime() > seenTs,
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return { requests, items: items.slice(0, 30) };
}
