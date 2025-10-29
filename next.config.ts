import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude Puppeteer packages from bundling (required for Vercel deployment)
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
