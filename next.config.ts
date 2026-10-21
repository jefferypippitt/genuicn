import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

const baseConfig: NextConfig = {
  /*
  config options here
  */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const nextConfig = withBotId(baseConfig);

export default nextConfig;
