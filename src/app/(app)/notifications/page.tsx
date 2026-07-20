import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications";
import { acceptFriend, removeFriend } from "@/app/actions/friends";
import { Avatar } from "@/components/Avatar";
import { CoverImage } from "@/components/CoverImage";
import { ScoreBadge } from "@/components/ScoreBadge";
import { IconComment, IconStar } from "@/components/icons";
import { cn, timeAgo } from "@/lib/utils";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { requests, items } = await getNotifications(supabase, user!.id);

  // Mark as read for next time (unread flags above were computed first).
  await supabase
    .from("profiles")
    .update({ last_seen_notifications: new Date().toISOString() })
    .eq("id", user!.id);

  const empty = requests.length === 0 && items.length === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-serif text-2xl font-bold text-ink">Notifications</h1>

      {empty && (
        <div className="card text-sm text-muted">
          You&apos;re all caught up.
        </div>
      )}

      {requests.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Friend requests
          </h2>
          {requests.map((r) => (
            <div key={r.id} className="card flex items-center gap-3 py-3">
              <Avatar
                url={r.requester.avatar}
                name={r.requester.name}
                size={36}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">
                    {r.requester.name ?? "Someone"}
                  </span>{" "}
                  wants to be friends
                </p>
                <p className="text-[11px] text-muted">{timeAgo(r.at)}</p>
              </div>
              <div className="flex gap-2">
                <form action={acceptFriend}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="btn btn-primary px-3 py-1.5 text-sm"
                  >
                    Accept
                  </button>
                </form>
                <form action={removeFriend}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="btn btn-ghost px-3 py-1.5 text-sm"
                  >
                    Ignore
                  </button>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}

      {items.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Recent
          </h2>
          <ul className="space-y-2">
            {items.map((n, i) => (
              <li
                key={n.id}
                className="list-in"
                style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
              >
                <Link
                  href={
                    n.kind === "compare" && n.album
                      ? `/album/${n.album.id}/compare/${n.actor.id}`
                      : n.album
                        ? `/album/${n.album.id}`
                        : "/"
                  }
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 shadow-[0_1px_2px_rgba(38,37,33,0.06)] transition",
                    n.unread
                      ? "border-accent/50 bg-accent-soft hover:border-accent"
                      : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar url={n.actor.avatar} name={n.actor.name} size={36} />
                    <span className="absolute -right-1 -bottom-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-line bg-surface text-body">
                      {n.kind === "comment" ? (
                        <IconComment size={11} />
                      ) : (
                        <IconStar size={11} />
                      )}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">
                        {n.actor.name ?? "A friend"}
                      </span>{" "}
                      {n.kind === "comment" ? (
                        <>
                          commented on{" "}
                          <span className="font-medium">{n.album?.title}</span>
                        </>
                      ) : (
                        <>
                          rated <span className="font-medium">{n.album?.title}</span>{" "}
                          — tap to compare
                        </>
                      )}
                    </p>
                    {n.text && (
                      <p className="truncate text-xs text-muted">
                        &ldquo;{n.text}&rdquo;
                      </p>
                    )}
                    <p className="text-[11px] text-muted">{timeAgo(n.at)}</p>
                  </div>
                  {n.kind === "compare" && n.score != null && (
                    <ScoreBadge score={n.score} className="shrink-0" />
                  )}
                  {n.album?.cover && (
                    <CoverImage
                      url={n.album.cover}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-md"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
