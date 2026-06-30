// Domain types mirroring the Postgres schema (supabase/migrations/0001_init.sql).

export type Visibility = "friends" | "public" | "private";
export type ReplayValue = "Low" | "Medium" | "High" | "Very High";
export type FriendStatus = "pending" | "accepted";
export type CommentTarget = "album" | "track" | "rating";

export const REPLAY_VALUES: ReplayValue[] = [
  "Low",
  "Medium",
  "High",
  "Very High",
];

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  visibility: Visibility;
  created_at: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  release_year: number | null;
  genre: string | null;
  cover_image_url: string | null;
  created_by: string;
  created_at: string;
}

export interface Track {
  id: string;
  album_id: string;
  name: string;
  track_order: number;
}

export interface Rating {
  id: string;
  album_id: string;
  user_id: string;
  /** Auto-computed average of the user's track ratings (DB trigger). */
  overall_rating: number | null;
  first_listen_date: string | null;
  favorite_track_id: string | null;
  least_favorite_track_id: string | null;
  notes: string | null;
}

export interface TrackRating {
  id: string;
  track_id: string;
  user_id: string;
  rating: number;
  replay_value: ReplayValue | null;
  notes: string | null;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendStatus;
  created_at: string;
}

export interface Comment {
  id: string;
  target_type: CommentTarget;
  target_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

// ---- Composite / view types used by the UI ----

export interface AlbumWithMyRating extends Album {
  my_overall: number | null;
  track_count: number;
}

export interface CommentWithAuthor extends Comment {
  author: Pick<Profile, "id" | "display_name" | "avatar_url">;
}
