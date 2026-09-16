"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatMonthLabel, monthParam } from "@/lib/monthlyFavorites";

export function MonthlyFavoritesMonthChooser({
  month,
  currentMonth,
}: {
  month: string;
  currentMonth: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [destination, setDestination] = useState(monthParam(month));
  const selectedParam = monthParam(month);
  const currentParam = monthParam(currentMonth);
  const label = formatMonthLabel(`${destination}-01`);

  function chooseMonth(value: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value > currentParam) {
      return;
    }

    setDestination(value);
    startTransition(() => {
      router.push(
        value === currentParam ? "/favourites" : `/favourites/${value}`,
        { scroll: false },
      );
    });
  }

  return (
    <div className="month-editor rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(38,37,33,0.06)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label className="label" htmlFor="favourites-month">
            Editing list for
          </label>
          <input
            id="favourites-month"
            type="month"
            value={destination}
            max={currentParam}
            onChange={(event) => chooseMonth(event.target.value)}
            className="input min-h-11 w-full font-medium sm:w-48"
          />
        </div>

        <div
          key={destination}
          className="month-saving-status flex items-center gap-2 rounded-full bg-sage-soft px-3 py-2 text-sm text-body"
          aria-live="polite"
        >
          <span
            className={`h-2 w-2 rounded-full bg-sage ${isPending ? "animate-pulse" : ""}`}
            aria-hidden="true"
          />
          <span>
            {isPending && destination !== selectedParam
              ? `Opening ${label}…`
              : `Saving songs to ${label}`}
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Each month has its own list. Changing this month never moves songs from
        another one.
      </p>
    </div>
  );
}
