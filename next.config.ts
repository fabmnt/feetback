import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      // Feetback media is served by Convex file storage on the deployment
      // domain, e.g. https://<deployment>.convex.cloud/api/storage/<uuid>.
      {
        protocol: "https",
        hostname: "**.convex.cloud",
        pathname: "/api/storage/**",
      },
    ],
  },
};

export default nextConfig;
