import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { MonthlyFavoritesPicker } from "@/components/MonthlyFavoritesPicker";
import {
  formatMonthLabel,
  getMonthlyFavorites,
  listMonthsWithPicks,
  monthKey,
  monthParam,
} from "@/lib/monthlyFavorites";

export default async function FavouritesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const currentMonth = monthKey();
  const [picks, months] = await Promise.all([
    getMonthlyFavorites(supabase, user.id, currentMonth),
    listMonthsWithPicks(supabase, user.id),
  ]);
  const pastMonths = months.filter((m) => m !== currentMonth);

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Favourite songs</h1>
        <p className="text-zinc-400">
          Pick up to 5 songs you loved this month — friends can see your list.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{formatMonthLabel(currentMonth)}</h2>
        <MonthlyFavoritesPicker month={currentMonth} picks={picks} />
      </section>

      {pastMonths.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Past months
          </h2>
          <ul className="space-y-1.5">
            {pastMonths.map((m) => (
              <li key={m}>
                <Link
                  href={`/favourites/${monthParam(m)}`}
                  className="block rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm transition hover:border-zinc-700"
                >
                  {formatMonthLabel(m)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
