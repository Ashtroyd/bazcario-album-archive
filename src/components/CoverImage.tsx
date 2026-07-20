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
        className={cn("bg-ivory object-cover", className)}
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
