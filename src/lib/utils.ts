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

/** Compact relative time: "just now", "3h ago", "2d ago", else a date. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return formatDate(iso);
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
