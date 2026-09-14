// Runs before each test file's imports resolve — must set DATABASE_URL
// before anything imports src/lib/db.ts, which reads it at module load.
process.env.DATABASE_URL = "file:./vitest-test.db";
