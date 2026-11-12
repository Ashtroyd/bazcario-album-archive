import Image from "next/image";
import { initials } from "@/lib/utils";

/** Avatars uploaded through the profile page live in our own Supabase bucket. */
function isOwnAvatarUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname === new URL(base).hostname &&
      u.pathname.startsWith("/storage/v1/object/public/avatars/")
    );
  } catch {
    return false;
  }
}

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
    if (isOwnAvatarUrl(url)) {
      return (
        <Image
          src={url}
          alt={name ?? "avatar"}
          width={size}
          height={size}
          style={style}
          className="rounded-full object-cover"
        />
      );
    }
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
