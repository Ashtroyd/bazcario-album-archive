import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { MonthlyFavoritesCard } from "@/components/MonthlyFavoritesCard";
import {
  formatMonthLabel,
  getMonthlyFavorites,
  monthParamToKey,
} from "@/lib/monthlyFavorites";
import type { Profile } from "@/lib/types";

export default async function FriendFavouritesMonthPage({
  params,
}: {
  params: Promise<{ id: string; month: string }>;
}) {
  const { id, month: monthParamValue } = await params;
  const month = monthParamToKey(monthParamValue);
  if (!month) notFound();

  const user = await requireUser();
  const supabase = await createClient();

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", id)
    .maybeSingle();
  if (!profileData) notFound();
  const profile = profileData as Pick<
    Profile,
    "id" | "display_name" | "avatar_url"
  >;

  const { data: friendship } = await supabase
    .from("friendships")
    .select("status")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${user.id})`,
    )
    .maybeSingle();
  if (friendship?.status !== "accepted") notFound();

  const picks = await getMonthlyFavorites(supabase, id, month);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href={`/friends/${id}`}
        className="text-sm text-muted hover:underline"
      >
        ← {profile.display_name ?? "Friend"}
      </Link>

      <div className="flex items-center gap-3">
        <Avatar url={profile.avatar_url} name={profile.display_name} size={40} />
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">
            {formatMonthLabel(month)}
          </h1>
          <p className="text-sm text-muted">
            {profile.display_name ?? "Friend"}&apos;s top picks
          </p>
        </div>
      </div>

      {picks.length === 0 ? (
        <div className="card text-sm text-muted">
          No favourites saved for this month.
        </div>
      ) : (
        <div className="card">
          <MonthlyFavoritesCard picks={picks} />
        </div>
      )}
    </div>
  );
}
