import Image from "next/image";
import { normalizeTrustedCoverUrl } from "@/lib/coverUrl";
import { cn } from "@/lib/utils";

/** `sizes` presets for the common cover layouts. */
export const COVER_SIZES = {
  /** Small list thumbnails (~40–80px). The default. */
  thumb: "96px",
  /** Library / dashboard grids: 2 columns on phones, 3–4 on wider screens. */
  grid: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px",
  /** Hero covers such as the album page header. */
  hero: "(max-width: 640px) 176px, 224px",
} as const;

export function CoverImage({
  url,
  alt,
  className,
  priority = false,
  sizes = COVER_SIZES.thumb,
}: {
  url?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  /** Rendered width hint so the optimizer serves a right-sized file. */
  sizes?: string;
}) {
  if (url) {
    const classes = cn("bg-ivory object-cover", className);
    // Only hosts listed in next.config `images.remotePatterns` can be
    // optimized; anything else (e.g. a legacy URL) falls back to a plain img.
    if (normalizeTrustedCoverUrl(url)) {
      return (
        <Image
          src={url}
          alt={alt}
          width={640}
          height={640}
          sizes={sizes}
          preload={priority}
          loading={priority ? "eager" : "lazy"}
          className={classes}
        />
      );
    }
    return (
      <img
        src={url}
        alt={alt}
        width={640}
        height={640}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className={classes}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-ivory font-serif text-3xl text-line-strong",
        className,
      )}
      aria-label={alt}
    >
      ♪
    </div>
  );
}
