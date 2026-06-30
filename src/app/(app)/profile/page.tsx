import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth";
import { updateProfile } from "@/app/actions/profile";
import { Avatar } from "@/components/Avatar";
import { formatScore } from "@/lib/utils";

export default async function ProfilePage() {
  const supabase = await createClient();
  const profile = await getMyProfile();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ratings } = await supabase
    .from("ratings")
    .select("overall_rating, albums(genre)")
    .eq("user_id", user!.id);

  const rated = (ratings ?? []) as unknown as {
    overall_rating: number | null;
    albums: { genre: string | null } | null;
  }[];
  const scored = rated
    .map((r) => r.overall_rating)
    .filter((n): n is number => n != null)
    .map(Number);
  const avg = scored.length
    ? scored.reduce((a, b) => a + b, 0) / scored.length
    : null;

  const genreCount: Record<string, number> = {};
  for (const r of rated) {
    const g = r.albums?.genre;
    if (g) genreCount[g] = (genreCount[g] || 0) + 1;
  }
  const topGenre =
    Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const { count: friendCount } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
    .eq("status", "accepted");

  const stats = [
    { label: "Albums rated", value: String(rated.length) },
    { label: "Average rating", value: formatScore(avg) },
    { label: "Top genre", value: topGenre },
    { label: "Friends", value: String(friendCount ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        {/* Settings */}
        <form action={updateProfile} className="card space-y-4">
          <div className="flex items-center gap-4">
            <Avatar
              url={profile?.avatar_url}
              name={profile?.display_name}
              size={64}
            />
            <div>
              <label className="label" htmlFor="avatar">
                Avatar
              </label>
              <input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/*"
                className="block text-sm text-zinc-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-zinc-200"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="display_name">
              Display name
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              defaultValue={profile?.display_name ?? ""}
              className="input"
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="input opacity-60"
            />
          </div>

          <div>
            <label className="label">Visibility</label>
            <span className="chip">Friends-only (default)</span>
            <p className="mt-1 text-xs text-zinc-500">
              A public/private toggle is coming. For now, your ratings are
              visible only to you and your accepted friends.
            </p>
          </div>

          <button type="submit" className="btn btn-primary">
            Save changes
          </button>
        </form>

        {/* Stats */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="card">
                <div className="text-xs tracking-wide text-zinc-400 uppercase">
                  {s.label}
                </div>
                <div className="mt-1 text-2xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
