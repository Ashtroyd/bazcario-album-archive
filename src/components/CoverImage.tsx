import { cn } from "@/lib/utils";

export function CoverImage({
  url,
  alt,
  className,
  priority = false,
}: {
  url?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        width={640}
        height={640}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
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
