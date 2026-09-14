import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx prisma migrate deploy && npm run dev -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    env: { DATABASE_URL: "file:./e2e-test.db" },
    timeout: 60_000,
  },
});
