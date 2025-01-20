// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Removed webpack configuration as Turbopack is the default bundler
};

export default nextConfig;
