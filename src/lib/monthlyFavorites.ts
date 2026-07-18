export type MonthlyFavorite = {
  id: string;
  user_id: string;
  month: string; // 'YYYY-MM-DD', always first-of-month
  position: number;
  title: string;
  artist: string;
  cover_url: string | null;
  external_id: string | null;
};

/** First-of-month key, e.g. '2026-07-01', for a given date (default: now). */
export function monthKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** '2026-07' short form, used in the /favourites/[month] route param. */
export function monthParam(key: string): string {
  return key.slice(0, 7);
}

/** '2026-07' route param -> full '2026-07-01' month key. */
export function monthParamToKey(param: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(param)) return null;
  return `${param}-01`;
}

export function formatMonthLabel(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function getMonthlyFavorites(
  supabase: any,
  userId: string,
  month: string,
): Promise<MonthlyFavorite[]> {
  const { data } = await supabase
    .from("monthly_favorites")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month)
    .order("position");
  return (data ?? []) as MonthlyFavorite[];
}

export type FriendMonthlyFavorites = {
  userId: string;
  name: string | null;
  avatar: string | null;
  picks: MonthlyFavorite[];
};

/** Friends' picks for a given month, grouped per friend (RLS already scopes visibility). */
export async function getFriendsMonthlyFavorites(
  supabase: any,
  friendIds: string[],
  month: string,
): Promise<FriendMonthlyFavorites[]> {
  if (friendIds.length === 0) return [];
  const { data } = await supabase
    .from("monthly_favorites")
    .select("*, profiles(display_name, avatar_url)")
    .in("user_id", friendIds)
    .eq("month", month)
    .order("position");

  const byUser = new Map<string, FriendMonthlyFavorites>();
  for (const row of data ?? []) {
    const existing = byUser.get(row.user_id);
    if (existing) {
      existing.picks.push(row);
    } else {
      byUser.set(row.user_id, {
        userId: row.user_id,
        name: row.profiles?.display_name ?? null,
        avatar: row.profiles?.avatar_url ?? null,
        picks: [row],
      });
    }
  }
  return [...byUser.values()];
}

/** Distinct months (newest first) a user has saved picks for. */
export async function listMonthsWithPicks(
  supabase: any,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("monthly_favorites")
    .select("month")
    .eq("user_id", userId)
    .order("month", { ascending: false });
  const months = (data ?? []).map((r: { month: string }) => r.month) as string[];
  return [...new Set(months)];
}
/* eslint-enable @typescript-eslint/no-explicit-any */
