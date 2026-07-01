import { Vibrant } from "node-vibrant/node";
import type { CoverColors } from "./types";

/** Relative luminance (0–1) of a #rrggbb color. */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const ch = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(ch(0)) + 0.7152 * lin(ch(2)) + 0.0722 * lin(ch(4));
}

/** Darken a #rrggbb color toward black by `amount` (0–1). */
function darken(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const scale = (i: number) =>
    Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - amount))
      .toString(16)
      .padStart(2, "0");
  return `#${scale(0)}${scale(2)}${scale(4)}`;
}

/**
 * Extract an Apple-Music-style palette from a cover image: a dark, readable
 * background tint + a vivid accent + a contrast-safe text color. Server-only.
 * Returns null on any failure (caller falls back to the default theme).
 */
export async function extractColors(
  imageUrl: string,
): Promise<CoverColors | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const p = await new Vibrant(buf).getPalette();

    const bgSwatch = p.DarkVibrant ?? p.DarkMuted ?? p.Vibrant ?? p.Muted;
    if (!bgSwatch) return null;
    const accentSwatch =
      p.Vibrant ?? p.LightVibrant ?? p.LightMuted ?? bgSwatch;

    let bg = bgSwatch.hex;
    // Keep the hero background dark enough for light text.
    if (luminance(bg) > 0.35) bg = darken(bg, 0.55);
    const text = luminance(bg) > 0.5 ? "#0a0a0a" : "#ffffff";

    return { bg, accent: accentSwatch.hex, text };
  } catch {
    return null;
  }
}
