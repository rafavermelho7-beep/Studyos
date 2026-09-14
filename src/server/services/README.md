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
4. **`updateMany`/`deleteMany` with `{ id, userId }` in `where` is the
   default-safe pattern** — it silently affects 0 rows for a mismatched
   owner. Watch out when a model's unique key is something OTHER than its
   own `id` (e.g. `ReviewState.topicId`, `@unique` on its own): an
   `upsert`/`update` keyed on just that field, without first checking the
   *related* row's ownership, can silently mutate another user's data
   instead of erroring. `gradeReview` in `reviews.ts` had exactly this bug
   (fixed — see the comment there and `reviews.test.ts`); when a model's
   unique key isn't `{id, userId}` or a compound including `userId`,
   explicitly verify ownership of the referenced row(s) before the
   upsert/update, the way `startReview` and `addExamTopic` do.
