import type { CommentRow } from "@/components/CommentsThread";
import type { ReplayValue } from "@/lib/types";

export type FriendScore = { name: string | null; avatar: string | null; score: number };

export type TrackRow = {
  id: string;
  name: string;
  order: number;
  rating: number | null;
  replay: ReplayValue | null;
  notes: string | null;
  friends: FriendScore[];
  /** Comments on this track, oldest first. */
  comments: CommentRow[];
};

export type RatingSnapshot = {
  rating: string;
  replay: ReplayValue | "";
  notes: string;
};

export type SaveNotice =
  | { kind: "saved"; trackName: string; undo: () => void }
  | { kind: "undone"; trackName: string }
  | { kind: "error"; trackName: string; message: string };

export type Toast = SaveNotice & { id: number };

export const SHORT_REPLAY: Record<ReplayValue, string> = {
  Low: "Low",
  Medium: "Med",
  High: "High",
  "Very High": "V.High",
};

/** The signed-in viewer, for posting comments. */
export type Viewer = { id: string; name: string | null; avatar: string | null };
