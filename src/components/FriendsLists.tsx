"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { acceptFriend, removeFriend } from "@/app/actions/friends";
import { Avatar } from "@/components/Avatar";

export type ProfileLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
};
export type FriendshipRow = {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted";
  created_at: string;
  requester: ProfileLite | null;
  recipient: ProfileLite | null;
};

type Action = { type: "accept"; id: string } | { type: "remove"; id: string };

function reducer(state: FriendshipRow[], action: Action): FriendshipRow[] {
  switch (action.type) {
    case "accept":
      return state.map((r) =>
        r.id === action.id ? { ...r, status: "accepted" as const } : r,
      );
    case "remove":
      return state.filter((r) => r.id !== action.id);
  }
}

export function FriendsLists({
  rows,
  meId,
}: {
  rows: FriendshipRow[];
  meId: string;
}) {
  const [optimisticRows, applyOptimistic] = useOptimistic(rows, reducer);
  const [, startTransition] = useTransition();

  const accepted = optimisticRows.filter((r) => r.status === "accepted");
  const incoming = optimisticRows.filter(
    (r) => r.status === "pending" && r.friend_id === meId,
  );
  const outgoing = optimisticRows.filter(
    (r) => r.status === "pending" && r.user_id === meId,
  );
  const other = (r: FriendshipRow) =>
    r.user_id === meId ? r.recipient : r.requester;

  function accept(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "accept", id });
      const fd = new FormData();
      fd.set("id", id);
      await acceptFriend(fd);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "remove", id });
      const fd = new FormData();
      fd.set("id", id);
      await removeFriend(fd);
    });
  }

  return (
    <>
      {incoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Requests ({incoming.length})
          </h2>
          {incoming.map((r) => (
            <div key={r.id} className="card flex items-center gap-3 py-3">
              <Avatar
                url={r.requester?.avatar_url}
                name={r.requester?.display_name}
                size={36}
              />
              <span className="font-medium">
                {r.requester?.display_name ?? r.requester?.email}
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => accept(r.id)}
                  className="btn btn-primary px-3 py-1.5 text-sm"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="btn btn-ghost px-3 py-1.5 text-sm"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Sent ({outgoing.length})
          </h2>
          {outgoing.map((r) => (
            <div key={r.id} className="card flex items-center gap-3 py-3">
              <Avatar
                url={r.recipient?.avatar_url}
                name={r.recipient?.display_name}
                size={36}
              />
              <span className="font-medium">
                {r.recipient?.display_name ?? r.recipient?.email}
              </span>
              <span className="chip ml-1">pending</span>
              <button
                type="button"
                onClick={() => remove(r.id)}
                className="btn btn-ghost ml-auto px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
          Your friends ({accepted.length})
        </h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-muted">
            No friends yet. Search above to add some.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {accepted.map((r) => {
              const o = other(r);
              return (
                <div key={r.id} className="card flex items-center gap-3 py-3">
                  <Avatar url={o?.avatar_url} name={o?.display_name} size={36} />
                  <Link
                    href={`/friends/${o?.id}`}
                    className="font-medium hover:underline"
                  >
                    {o?.display_name ?? o?.email}
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="btn btn-danger ml-auto px-3 py-1.5 text-sm"
                  >
                    Unfriend
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
