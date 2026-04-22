import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
      typescript: {
              ignoreBuildErrors: true,
      },
      eslint: {
              ignoreDuringBuilds: true,
      },
      serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3"],
      turbopack: {},
};

export default withSerwist(nextConfig);
