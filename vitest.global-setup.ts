import { execSync } from "node:child_process";

// Runs once before the whole Vitest run: make sure the (shared, real)
// Supabase Postgres schema is up to date. `migrate deploy` reads
// DATABASE_URL from .env itself and is a no-op if already current.
export default function setup() {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
}
