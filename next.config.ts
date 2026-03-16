import type { NextConfig } from "next";

const nextConfig: NextConfig = {
      typescript: {
              ignoreBuildErrors: true,
      },
      eslint: {
              ignoreDuringBuilds: true,
      },
      serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3"],
};

export default nextConfig;
