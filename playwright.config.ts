import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Runs against the same Supabase Postgres as `npm run dev` -- there's
    // no local Postgres in this environment to give tests their own
    // database. All specs use @example.com throwaway emails, swept clean
    // by global-teardown.ts after the run (see its comment).
    command: "npx prisma migrate deploy && npm run dev -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
