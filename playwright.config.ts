import { defineConfig, devices } from "@playwright/test";
import { getBase } from "./scripts/lib/deploy-base.mjs";

const SITE_BASE = getBase();

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
