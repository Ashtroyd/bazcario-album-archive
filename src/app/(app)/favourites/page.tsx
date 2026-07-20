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
        <h1 className="font-serif text-2xl font-bold text-ink">Favourite songs</h1>
        <p className="text-muted">
          Pick up to 5 songs you loved this month — friends can see your list.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-semibold text-ink">
          {formatMonthLabel(currentMonth)}
        </h2>
        <MonthlyFavoritesPicker month={currentMonth} picks={picks} />
      </section>

      {pastMonths.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Past months
          </h2>
          <ul className="space-y-1.5">
            {pastMonths.map((m) => (
              <li key={m}>
                <Link
                  href={`/favourites/${monthParam(m)}`}
                  className="block rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body transition hover:border-line-strong"
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
