import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { CoverImage } from "@/components/CoverImage";
import { ScoreBadge } from "@/components/ScoreBadge";
import {
  IconStar,
  IconComment,
  IconPlus,
  IconUserPlus,
} from "@/components/icons";
import { timeAgo } from "@/lib/utils";
import type { ActivityItem } from "@/lib/activity";

const ICON: Record<
  ActivityItem["type"],
  (props: { className?: string; size?: number }) => React.ReactElement
> = {
  rating: IconStar,
  comment: IconComment,
  album: IconPlus,
  friend: IconUserPlus,
};

function linkFor(item: ActivityItem): string {
  if (item.type === "friend") return `/friends/${item.actor.id}`;
  if (item.album) {
    return item.type === "rating"
      ? `/album/${item.album.id}/compare/${item.actor.id}`
      : `/album/${item.album.id}`;
  }
  return "/";
}

function Verb({ item }: { item: ActivityItem }) {
  switch (item.type) {
    case "rating":
      return (
        <>
          rated <span className="font-medium">{item.album?.title}</span>
        </>
      );
    case "comment":
      return (
        <>
          commented on{" "}
          <span className="font-medium">{item.album?.title ?? "an album"}</span>
        </>
      );
    case "album":
      return (
        <>
          added <span className="font-medium">{item.album?.title}</span>
        </>
      );
    case "friend":
      return <>became your friend</>;
  }
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card text-sm text-muted">
        No friend activity yet.{" "}
        <Link href="/friends" className="text-accent hover:underline">
          Add friends →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={item.id}
          className="list-in"
          style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
        >
          <Link
            href={linkFor(item)}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(38,37,33,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_12px_28px_rgba(38,37,33,0.14)]"
          >
            <div className="relative shrink-0">
              <Avatar url={item.actor.avatar} name={item.actor.name} size={38} />
              <span className="absolute -right-1 -bottom-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-line bg-surface text-body">
                {ICON[item.type]({ size: 11 })}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-body">
                <span className="font-medium text-ink">
                  {item.actor.name ?? "A friend"}
                </span>{" "}
                <Verb item={item} />
              </p>
              {item.text && (
                <p className="truncate text-xs text-muted">
                  &ldquo;{item.text}&rdquo;
                </p>
              )}
              <p className="text-[11px] text-muted">{timeAgo(item.at)}</p>
            </div>
            {item.type === "rating" && item.score != null && (
              <ScoreBadge score={item.score} className="shrink-0" />
            )}
            {item.album?.cover && (
              <CoverImage
                url={item.album.cover}
                alt=""
                className="h-11 w-11 shrink-0 rounded-md"
              />
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
