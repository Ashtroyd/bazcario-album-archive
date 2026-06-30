import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AddFriendSearch } from "@/components/AddFriendSearch";
import { Avatar } from "@/components/Avatar";
import { acceptFriend, removeFriend } from "@/app/actions/friends";

type ProfileLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
};
type Row = {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted";
  created_at: string;
  requester: ProfileLite | null;
  recipient: ProfileLite | null;
};

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("friendships")
    .select(
      `id, user_id, friend_id, status, created_at,
       requester:profiles!friendships_user_id_fkey(id, display_name, avatar_url, email),
       recipient:profiles!friendships_friend_id_fkey(id, display_name, avatar_url, email)`,
    )
    .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];
  const accepted = rows.filter((r) => r.status === "accepted");
  const incoming = rows.filter(
    (r) => r.status === "pending" && r.friend_id === user!.id,
  );
  const outgoing = rows.filter(
    (r) => r.status === "pending" && r.user_id === user!.id,
  );
  const other = (r: Row) => (r.user_id === user!.id ? r.recipient : r.requester);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Friends</h1>

      <AddFriendSearch />

      {incoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
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
                    Decline
                  </button>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
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
              <form action={removeFriend} className="ml-auto">
                <input type="hidden" name="id" value={r.id} />
                <button
                  type="submit"
                  className="btn btn-ghost px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
              </form>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Your friends ({accepted.length})
        </h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-zinc-500">
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
                  <form action={removeFriend} className="ml-auto">
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="btn btn-danger px-3 py-1.5 text-sm"
                    >
                      Unfriend
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
