# Services

Framework-agnostic business logic and data access. Rules:

1. **Every function takes `userId` as its first argument and every Prisma
   query filters by it.** This is the substitute for Postgres Row Level
   Security while we run on SQLite — it is the *entire* authorization
   boundary, so a missing `userId` filter here is a cross-user data leak.
   When we migrate to Postgres/Supabase, mirror each of these filters as an
   RLS policy and this module becomes a defense-in-depth layer instead of
   the only layer.
2. No Next.js imports here (`next/navigation`, `next/headers`, etc.) —
   server actions and route handlers call into services, not the other way
   around, so services stay testable in isolation.
3. Return plain data (or throw), no HTTP/redirect concerns.
