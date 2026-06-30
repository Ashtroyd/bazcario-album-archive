/** Join class names, dropping falsy values. */
export function cn(
  ...classes: (string | false | null | undefined)[]
): string {
  return classes.filter(Boolean).join(" ");
}

/** Format a 0–10 score, trimming trailing zeros (10, 8.5, 9.23). */
export function formatScore(
  n: number | string | null | undefined,
): string {
  if (n === null || n === undefined || n === "") return "—";
  const num = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(num)) return "—";
  return String(Math.round(num * 100) / 100);
}

/** Tailwind text color class bucketed by score. */
export function scoreColor(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n))
    return "text-zinc-400";
  if (n >= 9) return "text-emerald-500";
  if (n >= 7.5) return "text-lime-500";
  if (n >= 6) return "text-amber-500";
  if (n >= 4) return "text-orange-500";
  return "text-red-500";
}

/** Format an ISO date (or null) for display. */
export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Initials for an avatar fallback. */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
