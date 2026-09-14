import { PrismaClient } from "@prisma/client";

// e2e specs all use throwaway emails like "<feature>-<timestamp>@example.com"
// against the SAME Supabase Postgres the app uses for real dev/personal use
// (no local Postgres available to isolate tests into their own database).
// example.com is IANA-reserved and never a real account, so it's safe to
// sweep clean after every run rather than let test users accumulate.
export default async function globalTeardown() {
  const db = new PrismaClient();
  try {
    const { count } = await db.user.deleteMany({ where: { email: { endsWith: "@example.com" } } });
    if (count > 0) console.log(`[e2e teardown] removed ${count} throwaway test user(s)`);
  } finally {
    await db.$disconnect();
  }
}
