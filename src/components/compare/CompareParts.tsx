import { Avatar } from "@/components/Avatar";
import { ReplayBadge } from "@/components/ReplayBadge";
import { ScoreBadge } from "@/components/ScoreBadge";
import { IconHeart, IconMoon } from "@/components/icons";
import type { ReplayValue } from "@/lib/types";
import { formatDate, formatScore } from "@/lib/utils";

export type Side = {
  rating: number | null;
  replay: ReplayValue | null;
  notes: string | null;
} | null;

export type RatingRow = {
  user_id: string;
  overall_rating: number | null;
  first_listen_date: string | null;
  favorite_track_id: string | null;
  least_favorite_track_id: string | null;
  notes: string | null;
};

export function gapBg(gap: number | null): string {
  if (gap == null) return "bg-surface";
  if (gap >= 3) return "bg-accent-soft";
  if (gap >= 1.5) return "bg-star/10";
  return "bg-surface";
}

export function PersonHeader({
  name,
  avatarUrl,
  avatarName,
  overall,
  accent,
}: {
  name: string;
  avatarUrl?: string | null;
  avatarName?: string | null;
  overall: number | null;
  accent: string;
}) {
  return (
    <div className="card flex items-center gap-3 py-3">
      <Avatar url={avatarUrl} name={avatarName ?? name} size={40} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-ink">{name}</div>
        {overall != null ? (
          <div
            className="text-2xl font-bold tabular-nums"
            style={{ color: accent }}
          >
            {formatScore(overall)}
          </div>
        ) : (
          <div className="text-2xl font-bold text-muted">—</div>
        )}
      </div>
    </div>
  );
}

export function DetailColumn({
  rating,
  trackName,
}: {
  rating: RatingRow | null;
  trackName: (tid: string | null) => string | null;
}) {
  const fav = trackName(rating?.favorite_track_id ?? null);
  const least = trackName(rating?.least_favorite_track_id ?? null);
  const hasAny =
    rating && (rating.first_listen_date || fav || least || rating.notes);

  return (
    <div className="card space-y-1.5 text-sm">
      {!hasAny ? (
        <p className="text-muted">No details.</p>
      ) : (
        <>
          {rating?.first_listen_date && (
            <div className="text-body">
              <span className="text-muted">First listen: </span>
              {formatDate(rating.first_listen_date)}
            </div>
          )}
          {fav && (
            <div className="flex items-center gap-1.5 text-body">
              <IconHeart size={13} className="shrink-0 text-muted" />
              <span className="text-muted">Favourite:</span> {fav}
            </div>
          )}
          {least && (
            <div className="flex items-center gap-1.5 text-body">
              <IconMoon size={13} className="shrink-0 text-muted" />
              <span className="text-muted">Least favourite:</span> {least}
            </div>
          )}
          {rating?.notes && (
            <p className="break-words whitespace-pre-wrap text-muted">{rating.notes}</p>
          )}
        </>
      )}
    </div>
  );
}

export function TrackSide({ side, label }: { side: Side; label: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[10px] tracking-wide text-muted uppercase sm:hidden">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <ScoreBadge score={side?.rating ?? null} />
        <ReplayBadge value={side?.replay ?? null} />
      </div>
      {side?.notes ? (
        <p className="mt-1 text-xs break-words whitespace-pre-wrap text-muted">
          {side.notes}
        </p>
      ) : side?.rating == null ? (
        <p className="mt-1 text-xs text-muted">not rated</p>
      ) : null}
    </div>
  );
}
