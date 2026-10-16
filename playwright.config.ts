import { devices } from "@playwright/test";
import type { PlaywrightTestConfig } from "@playwright/test";

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? "http://localhost:3100";

const config: PlaywrightTestConfig = {
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: "html",
  retries: process.env.CI ? 2 : 0,
  testDir: "./test",
  // Vitest owns *.test.ts in the same folder.
  testMatch: "**/*.spec.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // A production build: `next dev` compiles each page on first visit and
  // reloads it, and only one `next dev` may run per project.
  webServer: externalBaseURL
    ? undefined
    : {
        command: "pnpm exec next build && pnpm exec next start --port 3100",
        reuseExistingServer: false,
        stdout: "pipe",
        timeout: 300_000,
        url: baseURL,
      },
  workers: 1,
};

export default config;
