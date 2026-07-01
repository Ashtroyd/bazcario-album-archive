import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node-vibrant does color extraction with Node-only image decoding; keep it
  // out of the bundle so it runs as a normal server dependency.
  serverExternalPackages: ["node-vibrant"],
};

export default nextConfig;
