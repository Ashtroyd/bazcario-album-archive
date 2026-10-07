import { createClient } from "@/lib/supabase/server";
import { AddFriendSearch } from "@/components/AddFriendSearch";
import { FriendsLists, type FriendshipRow } from "@/components/FriendsLists";
import { FriendsHub } from "@/components/FriendsHub";
import { buildFriendsHub } from "@/lib/friends-hub";
import { loadHubRatings } from "@/lib/friends-hub-data";
import { redirect } from "next/navigation";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("friendships")
    .select(
      `id, user_id, friend_id, status, created_at,
       requester:profiles!friendships_user_id_fkey(id, display_name, avatar_url, email),
       recipient:profiles!friendships_friend_id_fkey(id, display_name, avatar_url, email)`,
    )
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as FriendshipRow[];
  const people = rows.filter((row) => row.status === "accepted").map((row) => {
    const person = row.user_id === user.id ? row.recipient : row.requester;
    return { id: row.user_id === user.id ? row.friend_id : row.user_id, name: person?.display_name ?? "Friend", avatar: person?.avatar_url ?? null };
  });
  let hub = buildFriendsHub(people, [], []);
  let insightsUnavailable = false;
  if (people.length) {
    try {
      const [mine, theirs] = await Promise.all([loadHubRatings(supabase, [user.id]), loadHubRatings(supabase, people.map((person) => person.id))]);
      hub = buildFriendsHub(people, mine, theirs);
    } catch {
      insightsUnavailable = true;
      console.error(JSON.stringify({ event: "friends_hub_load_failed" }));
    }
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-serif text-3xl font-bold tracking-tight text-ink">Friends</h1><p className="mt-1 text-sm text-muted">Good records. Familiar faces. A few differences of opinion.</p></div>
        <div className="flex flex-wrap gap-2"><a href="#your-friends" className="btn btn-ghost">Your circle · {people.length}</a>{rows.some((row) => row.status === "pending" && row.friend_id === user.id) && <a href="#your-friends" className="btn btn-primary">Friend requests</a>}<a href="#find-friends" className="btn btn-outline">Add a friend</a></div>
      </header>
      <FriendsHub data={hub} friendCount={people.length} unavailable={insightsUnavailable} />
      <div id="your-friends" className="scroll-mt-24 space-y-4">
        {error ? <p role="status" className="text-sm text-accent">Your friends couldn&apos;t load. Reload to try again.</p> : <FriendsLists rows={rows} meId={user.id} insights={hub.insights} />}
      </div>
      <section id="find-friends" className="scroll-mt-24"><AddFriendSearch /></section>
    </div>
  );
}
