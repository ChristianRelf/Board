import type { NextConfig } from "next";

const config: NextConfig = {
  distDir: process.env.BOARD_BUILD_DIR || ".next",
  output: "standalone",
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "cdn.discordapp.com" }] },
};

export default config;
