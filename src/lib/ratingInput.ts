export function normalizeRatingInput(value: string): string | null {
  if (value.trim() === "") return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return String(Math.round(Math.max(0, Math.min(10, parsed)) * 100) / 100);
}
