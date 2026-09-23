import Link from "next/link";
import { acceptFriend, removeFriend } from "@/app/actions/friends";
import { Avatar } from "@/components/Avatar";
import { CoverImage } from "@/components/CoverImage";
import { IconComment, IconStar } from "@/components/icons";
import { ScoreBadge } from "@/components/ScoreBadge";
import { getNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { cn, timeAgo } from "@/lib/utils";

export async function ActivityNotifications({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { requests, items } = await getNotifications(supabase, userId);

  await supabase
    .from("profiles")
    .update({ last_seen_notifications: new Date().toISOString() })
    .eq("id", userId);

  if (requests.length === 0 && items.length === 0) {
    return (
      <div className="card text-sm text-muted">
        You&apos;re all caught up. Friend requests, comments, and comparisons will
        appear here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {requests.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Friend requests
          </h2>
          {requests.map((request) => (
            <div key={request.id} className="card flex flex-wrap items-center gap-3 py-3">
              <Avatar url={request.requester.avatar} name={request.requester.name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{request.requester.name ?? "Someone"}</span>{" "}
                  wants to be friends
                </p>
                <p className="text-[11px] text-muted">{timeAgo(request.at)}</p>
              </div>
              <div className="ml-auto flex shrink-0 gap-2">
                <form action={acceptFriend}>
                  <input type="hidden" name="id" value={request.id} />
                  <button type="submit" className="btn btn-primary px-3 py-1.5 text-sm">Accept</button>
                </form>
                <form action={removeFriend}>
                  <input type="hidden" name="id" value={request.id} />
                  <button type="submit" className="btn btn-ghost px-3 py-1.5 text-sm">Ignore</button>
                </form>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {items.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Recent</h2>
          <ul className="space-y-2">
            {items.map((notification, index) => (
              <li key={notification.id} className="list-in" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
                <Link
                  href={notification.kind === "compare" && notification.album
                    ? `/album/${notification.album.id}/compare/${notification.actor.id}`
                    : notification.album ? `/album/${notification.album.id}` : "/"}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 shadow-[0_1px_2px_rgba(38,37,33,0.06)] transition",
                    notification.unread
                      ? "border-accent/50 bg-accent-soft hover:border-accent"
                      : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar url={notification.actor.avatar} name={notification.actor.name} size={36} />
                    <span className="absolute -right-1 -bottom-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-line bg-surface text-body">
                      {notification.kind === "comment" ? <IconComment size={11} /> : <IconStar size={11} />}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{notification.actor.name ?? "A friend"}</span>{" "}
                      {notification.kind === "comment" ? (
                        <>commented on <span className="font-medium">{notification.album?.title}</span></>
                      ) : (
                        <>rated <span className="font-medium">{notification.album?.title}</span> — tap to compare</>
                      )}
                    </p>
                    {notification.text ? <p className="truncate text-xs text-muted">&ldquo;{notification.text}&rdquo;</p> : null}
                    <p className="text-[11px] text-muted">{timeAgo(notification.at)}</p>
                  </div>
                  {notification.kind === "compare" && notification.score != null ? (
                    <ScoreBadge score={notification.score} className="shrink-0" />
                  ) : null}
                  {notification.album?.cover ? (
                    <CoverImage url={notification.album.cover} alt="" className="h-11 w-11 shrink-0 rounded-md" />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
