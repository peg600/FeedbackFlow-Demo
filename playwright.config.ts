import { defineConfig, devices } from "@playwright/test";

import { readTestDatabaseEnvironment } from "./tests/helpers/test-database";

const testDatabase = readTestDatabaseEnvironment();
const testAuthSecret = process.env.TEST_BETTER_AUTH_SECRET?.trim();
const packageRunner = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

if (!testAuthSecret || testAuthSecret.length < 32) {
  throw new Error("TEST_BETTER_AUTH_SECRET must be at least 32 characters for E2E tests.");
}

export default defineConfig({
  globalSetup: "./tests/global-test-setup.ts",
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `${packageRunner} dev -- --port 3100`,
    env: {
      ...process.env,
      BETTER_AUTH_SECRET: testAuthSecret,
      BETTER_AUTH_URL: "http://127.0.0.1:3100",
      DATABASE_URL: testDatabase.databaseUrl,
      DATABASE_URL_UNPOOLED: testDatabase.databaseUrlUnpooled,
      NODE_ENV: "development",
    },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
  },
});
