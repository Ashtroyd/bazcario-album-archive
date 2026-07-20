import { initials } from "@/lib/utils";

export function Avatar({
  url,
  name,
  size = 32,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
}) {
  const style = { width: size, height: size };
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? "avatar"}
        style={style}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={style}
      className="flex items-center justify-center rounded-full bg-accent font-medium text-white"
    >
      <span style={{ fontSize: size * 0.4 }}>{initials(name)}</span>
    </div>
  );
}
