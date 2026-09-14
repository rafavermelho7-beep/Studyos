import { execSync } from "node:child_process";

// Runs once before the whole Vitest run: apply migrations to a dedicated
// SQLite file so these tests never touch prisma/dev.db.
export default function setup() {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: "file:./vitest-test.db" },
    stdio: "inherit",
  });
}
