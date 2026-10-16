import type { ViteUserConfig } from "vitest/config";

const config: ViteUserConfig = {
  resolve: { tsconfigPaths: true },
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
  },
};

export default config;
