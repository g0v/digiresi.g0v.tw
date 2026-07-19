import { defineConfig, devices } from "@playwright/test";

const SITE_BASE = process.env.SITE_BASE ?? "/digiresi.g0v.tw/";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:4321${SITE_BASE}`,
  },
  webServer: {
    command: "npm run preview",
    url: `http://localhost:4321${SITE_BASE}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
