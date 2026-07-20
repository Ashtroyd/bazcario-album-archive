import { createClient } from "@/lib/supabase/server";
import { AddFriendSearch } from "@/components/AddFriendSearch";
import { FriendsLists, type FriendshipRow } from "@/components/FriendsLists";

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

  const rows = (data ?? []) as unknown as FriendshipRow[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Friends</h1>

      <AddFriendSearch />

      <FriendsLists rows={rows} meId={user!.id} />
    </div>
  );
}
