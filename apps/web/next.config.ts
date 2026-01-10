import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // Turborepo
  transpilePackages: [
    "@buildos/database",
    "@buildos/services",
    "@buildos/auth",
    "@buildos/rbac",
    "@buildos/estimate-engine",
    "@buildos/ui",
    "@buildos/i18n",
    "@buildos/config",
  ],
};

export default nextConfig;
