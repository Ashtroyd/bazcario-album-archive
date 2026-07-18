import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { MonthlyFavoritesPicker } from "@/components/MonthlyFavoritesPicker";
import {
  formatMonthLabel,
  getMonthlyFavorites,
  monthParamToKey,
} from "@/lib/monthlyFavorites";

export default async function FavouritesMonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month: monthParamValue } = await params;
  const month = monthParamToKey(monthParamValue);
  if (!month) notFound();

  const user = await requireUser();
  const supabase = await createClient();
  const picks = await getMonthlyFavorites(supabase, user.id, month);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/favourites" className="text-sm text-zinc-400 hover:underline">
        ← Favourite songs
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{formatMonthLabel(month)}</h1>
        <p className="text-zinc-400">Your top 5 for this month.</p>
      </div>

      <MonthlyFavoritesPicker month={month} picks={picks} />
    </div>
  );
}
