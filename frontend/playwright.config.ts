import { defineConfig, devices } from "@playwright/test";

// E2E config. Key idea: Playwright drives a REAL browser against a REAL running
// app — unlike Django's in-process test client. It auto-starts the Next dev server
// (webServer below), but it does NOT start Django/Postgres: the backend stack must
// already be up (docker compose up -d). That "the whole stack has to be running"
// requirement is the realistic cost of E2E, and where deploy-gaps hide.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000", // lets tests call page.goto("/")
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI, // reuse your running dev server locally
    timeout: 120_000,
  },
});
