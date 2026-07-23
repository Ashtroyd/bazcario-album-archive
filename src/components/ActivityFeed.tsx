"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

// Friend activity has no per-user record to delete (it's derived live from
// ratings/comments/albums/friendships), so "Clear" just hides anything at or
// before this moment — new activity still shows up afterward.
const CLEARED_KEY = "bazcario:activityClearedBefore";

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
  const [clearedBefore, setClearedBefore] = useState(0);

  useEffect(() => {
    try {
      setClearedBefore(Number(localStorage.getItem(CLEARED_KEY) ?? 0));
    } catch {
      // ignore
    }
  }, []);

  const visible = items.filter(
    (item) => new Date(item.at).getTime() > clearedBefore,
  );

  function handleClear() {
    const now = Date.now();
    try {
      localStorage.setItem(CLEARED_KEY, String(now));
    } catch {
      // ignore
    }
    setClearedBefore(now);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-ink">Activity</h2>
        {visible.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-full px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-ivory hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card text-sm text-muted">
          No friend activity yet.{" "}
          <Link href="/friends" className="text-accent hover:underline">
            Add friends →
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="card text-sm text-muted">You&apos;re all caught up.</div>
      ) : (
        <ul className="space-y-2">
          {visible.map((item, i) => (
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
      )}
    </section>
  );
}
