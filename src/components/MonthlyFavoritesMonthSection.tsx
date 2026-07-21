"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatMonthLabel,
  getMonthlyFavorites,
  monthKey,
  monthParam,
  type MonthlyFavorite,
} from "@/lib/monthlyFavorites";
import { MonthlyFavoritesCard } from "@/components/MonthlyFavoritesCard";

/** The signed-in user's monthly favourite picks, browsable month by month. */
export function MonthlyFavoritesMonthSection({ userId }: { userId: string }) {
  const currentParam = monthParam(monthKey());
  const [param, setParam] = useState(currentParam);
  const [picks, setPicks] = useState<MonthlyFavorite[] | null>(null);

  useEffect(() => {
    let alive = true;
    setPicks(null);
    const supabase = createClient();
    getMonthlyFavorites(supabase, userId, `${param}-01`).then(
      (p) => alive && setPicks(p),
    );
    return () => {
      alive = false;
    };
  }, [userId, param]);

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold text-ink">
          Monthly picks
        </h2>
        <input
          type="month"
          value={param}
          max={currentParam}
          onChange={(e) => setParam(e.target.value)}
          aria-label="Choose month"
          className="input w-auto text-sm"
        />
      </div>

      {picks == null ? null : picks.length === 0 ? (
        <p className="text-sm text-muted">
          No picks chosen for {formatMonthLabel(`${param}-01`)}.
        </p>
      ) : (
        <MonthlyFavoritesCard picks={picks} />
      )}
    </div>
  );
}
