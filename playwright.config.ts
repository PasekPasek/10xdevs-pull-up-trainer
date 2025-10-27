import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Load environment variables from .env.test
config({ path: ".env.test" });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Changed to false to run test files serially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Force single worker to ensure serial execution
  reporter: [["html"], ["list"]],
  timeout: 30000,
  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "astro dev",
    url: "http://localhost:3000",
    reuseExistingServer: false, // Always start fresh to ensure correct env vars
    timeout: 120000,
  },
});
