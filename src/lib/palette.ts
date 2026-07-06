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

/** Lighten a #rrggbb color toward white by `amount` (0–1). */
function lighten(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const scale = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16);
    return Math.round(c + (255 - c) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${scale(0)}${scale(2)}${scale(4)}`;
}

/** WCAG contrast ratio between two #rrggbb colors. */
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Legibility guard: dark covers can yield accents that vanish against the
 * hero background (e.g. deep indigo on near-black). Lighten the accent in
 * steps until it clears a readable contrast against the bg.
 */
function ensureReadableAccent(accent: string, bg: string): string {
  let out = accent;
  for (let i = 0; i < 12 && contrast(out, bg) < 4.5; i++) {
    out = lighten(out, 0.15);
  }
  return out;
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
    // Scores/accents rendered on the hero must stay legible. The hero fades
    // to the near-black page background, so guard against both.
    const accent = ensureReadableAccent(
      ensureReadableAccent(accentSwatch.hex, bg),
      "#09090b",
    );

    return { bg, accent, text };
  } catch {
    return null;
  }
}
