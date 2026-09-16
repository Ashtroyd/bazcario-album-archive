import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { MonthlyFavoritesPicker } from "@/components/MonthlyFavoritesPicker";
import { MonthlyFavoritesMonthChooser } from "@/components/MonthlyFavoritesMonthChooser";
import {
  formatMonthLabel,
  getMonthlyFavorites,
  isEditableMonthKey,
  monthKey,
  monthParamToKey,
} from "@/lib/monthlyFavorites";

export default async function FavouritesMonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month: monthParamValue } = await params;
  const month = monthParamToKey(monthParamValue);
  if (!month || !isEditableMonthKey(month)) notFound();

  const user = await requireUser();
  const supabase = await createClient();
  const picks = await getMonthlyFavorites(supabase, user.id, month);

  return (
    <div className="max-w-lg space-y-6">
      <Link href="/favourites" className="text-sm text-muted hover:underline">
        ← Favourite songs
      </Link>

      <div>
        <h1 className="font-serif text-2xl font-bold text-ink">Favourite songs</h1>
        <p className="text-muted">Pick up to 5 songs for a month.</p>
      </div>

      <MonthlyFavoritesMonthChooser
        key={month}
        month={month}
        currentMonth={monthKey()}
      />

      <section className="space-y-3">
        <h2 className="sr-only">{formatMonthLabel(month)} picks</h2>
        <MonthlyFavoritesPicker key={month} month={month} picks={picks} />
      </section>
    </div>
  );
}
