import { readFileSync } from "node:fs";

// Runs before each test file's imports resolve — must set DATABASE_URL
// before anything imports src/lib/db.ts, which reads it at module load.
// Unlike Next.js, plain Node/Vitest doesn't auto-load .env, so parse it
// here (no new dependency for a two-line key=value file).
try {
  const envFile = readFileSync(new URL("./.env", import.meta.url), "utf-8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
} catch {
  // .env not present — rely on whatever the environment already provides.
}
