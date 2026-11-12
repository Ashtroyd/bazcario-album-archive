import type { NextConfig } from "next";

// Our own Supabase Storage host (covers + avatars). Optional so builds without
// env vars (CI) still work; those images then just aren't optimized.
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // node-vibrant does color extraction with Node-only image decoding; keep it
  // out of the bundle so it runs as a normal server dependency.
  serverExternalPackages: ["node-vibrant"],
  images: {
    // Keep in sync with `isProviderCoverUrl` in src/lib/coverUrl.ts.
    remotePatterns: [
      { protocol: "https", hostname: "mzstatic.com", pathname: "/image/**" },
      { protocol: "https", hostname: "**.mzstatic.com", pathname: "/image/**" },
      { protocol: "https", hostname: "i.scdn.co", pathname: "/image/**" },
      { protocol: "https", hostname: "coverartarchive.org", pathname: "/release-group/**" },
      { protocol: "https", hostname: "archive.org", pathname: "/download/**" },
      { protocol: "https", hostname: "**.archive.org" },
      ...(supabaseHost
        ? [
            { protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/covers/**" },
            { protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/avatars/**" },
          ]
        : []),
    ],
    // Covers rarely change; cache optimized versions for a week.
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
};

export default nextConfig;
