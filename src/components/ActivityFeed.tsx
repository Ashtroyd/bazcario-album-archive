import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { CoverImage } from "@/components/CoverImage";
import { ScoreBadge } from "@/components/ScoreBadge";
import { timeAgo } from "@/lib/utils";
import type { ActivityItem } from "@/lib/activity";

const ICON: Record<ActivityItem["type"], string> = {
  rating: "⭐",
  comment: "💬",
  album: "➕",
  friend: "🤝",
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
      <div className="card text-sm text-zinc-400">
        No friend activity yet.{" "}
        <Link href="/friends" className="text-violet-400 hover:underline">
          Add friends →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={linkFor(item)}
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 transition hover:border-zinc-700"
          >
            <div className="relative shrink-0">
              <Avatar url={item.actor.avatar} name={item.actor.name} size={38} />
              <span className="absolute -right-1 -bottom-1 text-xs">
                {ICON[item.type]}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">
                  {item.actor.name ?? "A friend"}
                </span>{" "}
                <Verb item={item} />
              </p>
              {item.text && (
                <p className="truncate text-xs text-zinc-500">
                  &ldquo;{item.text}&rdquo;
                </p>
              )}
              <p className="text-[11px] text-zinc-500">{timeAgo(item.at)}</p>
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
