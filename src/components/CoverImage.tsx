import { cn } from "@/lib/utils";

export function CoverImage({
  url,
  alt,
  className,
}: {
  url?: string | null;
  alt: string;
  className?: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        className={cn("bg-zinc-800 object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-3xl text-zinc-600",
        className,
      )}
      aria-label={alt}
    >
      ♪
    </div>
  );
}
