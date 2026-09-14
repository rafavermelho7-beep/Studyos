# StudyOS — CLAUDE.md

Personal Study Operating System. Not a to-do list, not an Anki clone: it
turns study data into decisions ("what should I study right now, and why").
Full product vision lives in the original brief the user gave; this file is
the working reference for continuing development.

## Stack

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript, Tailwind v4
  (CSS-first config, tokens in `src/app/globals.css`)
- **Prisma 6.19 + Postgres on Supabase.** Started as local-first SQLite,
  migrated once the user created a Supabase project (2026-09-14) — see
  `prisma/schema.prisma` header comment for exactly what did and didn't
  change. `DATABASE_URL` is the **session pooler** string
  (`postgres.<ref>@aws-0-<region>.pooler.supabase.com:5432`) — NOT the
  direct connection (`db.<ref>.supabase.co:5432`) and NOT the transaction
  pooler (port 6543). Both of those are IPv6-only by default on Supabase;
  they connect fine from this dev machine (which has IPv6) but **fail
  silently in production on Vercel** (IPv4-only egress) with a generic
  "A server error occurred" — no useful client-side error, since Next
  strips server error details from the response. Found by smoke-testing
  the live Vercel deploy right after shipping it (see PROJECT_STATUS.md).
  Session pooler is the one IPv4-compatible option that doesn't need
  Supabase's paid dedicated-IPv4 add-on. If you ever change
  `DATABASE_URL`, get the exact string from Supabase's Settings →
  Database → Connection string → "Session pooler" → URI — don't guess
  the region suffix (`sa-east-1` here, but that's per-project). Append
  `?pgbouncer=true&connection_limit=1&pool_timeout=30` — Prisma's default
  pool size assumes a long-lived server, not a serverless function, and
  Supabase's free-tier session pooler caps at 15 total client connections
  (each idle session still holds a slot, not just active queries).
  `connection_limit=1` keeps each function instance to one connection;
  `pool_timeout=30` waits for a free slot instead of failing immediately.
  **The Vercel project's serverless function region must match the
  Supabase project's region** (both `sa-east-1`/`gru1` here) — a
  cross-continent function↔database round trip on every query was slow
  enough to cause intermittent connection failures on the first deploy,
  not just latency. Set via Vercel's Project Settings → Functions →
  Function Region (or `PATCH /v9/projects/<id>` with
  `serverlessFunctionRegion` via the API).
  - **Why not Prisma 7/8**: 7 changed datasource config in a breaking way
    (moved to `prisma.config.ts` + driver adapters) and 8 is an RC as of
    this writing. Pinned to the last stable 6.x. Revisit later.
  - **Supabase's own Auth/Storage/Realtime client is NOT used anywhere.**
    `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY` in
    `.env` are stored for possible future use (e.g. file storage) but
    nothing reads them today — the app talks to Postgres directly through
    Prisma, with its own auth (below).
- **Auth**: hand-rolled, not next-auth (still in beta after a long time)
  and not Supabase Auth either. bcrypt password hash
  (`src/lib/auth/password.ts`) + opaque DB-backed session token in an
  httpOnly cookie (`src/lib/auth/session.ts`). No OAuth yet — add an
  `Account` table back if/when a real social provider ships.
- **Authorization**: no Postgres RLS in use, even though the DB is real
  Postgres now — Prisma connects as the `postgres` role (bypasses RLS
  regardless, being the table owner) and auth is our own session cookie,
  not Supabase Auth's `auth.uid()` that RLS policies would key off. Every
  service function in `src/server/services/*` takes `userId` first and
  filters every query by it — that's the entire authorization boundary.
  Read `src/server/services/README.md` before adding a new service
  function. `src/proxy.ts` (Next 16's renamed `middleware.ts`) only does a
  cheap cookie-presence redirect for UX; it is never the source of truth.
- **Validation**: Zod, colocated with each feature's server actions.
- **Charts**: Recharts, following this repo's `dataviz` skill (load it
  before touching any chart code) — see `src/app/(app)/stats/`.
- **Spaced repetition**: `ts-fsrs` (real FSRS implementation, not a
  hand-rolled "looks scientific" algorithm), wired into `ReviewState` /
  `ReviewLog` via `src/server/services/reviews.ts`. Short-term (minutes-
  level) learning steps are disabled — this is topic-level review, not
  per-flashcard, so every proposed interval is >= 1 day.
- **Testing**: Playwright e2e (`e2e/`, config in `playwright.config.ts`,
  port 3100 to avoid clashing with `npm run dev` on 3000) and Vitest
  (`vitest.config.ts`, service-layer logic awkward to reach through the
  browser — currently the `gradeReview` IDOR regression,
  `src/server/services/reviews.test.ts`) both run against the **same real
  Supabase Postgres** as `npm run dev` — there's no local Postgres in this
  environment to give tests their own database. Every spec uses a
  throwaway `*@example.com` email (IANA-reserved, never a real account);
  `e2e/global-teardown.ts` deletes all such users after the Playwright run
  so they don't accumulate, and the Vitest spec cleans up the specific
  rows it created in its own `afterAll`. Add a spec per feature slice as a
  feature ships — this is how "funciona" gets verified, not just
  "compila". Because tests now hit a real network round-trip instead of a
  local SQLite file, **mutating actions need an explicit wait for
  confirmation before the next navigation** — `page.goto()` aborts an
  in-flight fetch from the page it's leaving, and several specs initially
  failed against Supabase for exactly this reason until waits were added
  (see PROJECT_STATUS.md's Supabase migration notes). For anything using
  `useOptimistic` (state flips before the server confirms), assert the
  visible state AND either wait for a value that only appears after
  revalidation or `await page.waitForLoadState("networkidle")` before
  navigating away. `vitest.config.ts` aliases `server-only` to an empty
  stub since that package unconditionally throws outside Next's bundler
  (Next silently swaps in its own no-op for server bundles; Vitest
  doesn't); `vitest.setup.ts` hand-parses `.env` since plain Node doesn't
  auto-load it the way Next does.

## Commands

```
npm run dev          # dev server, port 3000
npm run build         # production build (must stay clean, no warnings)
npx tsc --noEmit       # typecheck
npm run lint           # eslint
npm run test:e2e       # playwright e2e (spins its own server on :3100)
npm run test:unit      # vitest (service-layer logic, against the same Supabase Postgres)
npx prisma migrate dev --name <x>   # after editing schema.prisma (runs against Supabase)
npx prisma studio                   # inspect the Supabase database
```

## Conventions / decisions worth knowing before touching this code

- **Events, not aggregates**: `StudyEvent` is the single append-only fact
  table for all timed study activity (StudyOS sessions, Pomodoro,
  Anki/SanarFlix logs). Never add a "hours studied today" counter column —
  derive it from `StudyEvent` at query time. See schema comment and brief
  section 48.
- **No fake data, ever, outside test fixtures.** The dashboard/stats must
  degrade to an honest empty state rather than show placeholder numbers.
  Section 03/45 of the brief are absolute on this.
- **No pre-seeded subjects.** The app starts completely empty; the user
  creates their own subjects. Never add a seed script that inserts sample
  "Medicina/Cardiologia/etc." data into the dev or prod database.
- **Nav items** (`src/components/layout/nav-items.ts`) only list routes
  that are fully functional. Add the link in the same change that ships
  the page — never link to a stub.
- **Anki integration** (brief section 26): a hosted web app cannot reach
  Anki Desktop directly. Architecture: `StudyOS Web ← POST /api/anki/sync ←
  connector/sync.mjs (runs locally, reads AnkiConnect) ← Anki Desktop`.
  The connector authenticates with a per-user API key (Settings page,
  `src/lib/auth/api-key.ts`: `sk_live_<id>_<secret>`, only the bcrypt hash
  of the secret is stored, `apiKeyId` is indexed for O(1) lookup) — never
  a session cookie, since it's not a browser. Deck → subject/topic
  mapping is `AnkiDeckLink`, resolved with "::" hierarchy fallback
  (`resolveDeckLink` in `src/server/services/anki-links.ts`) so a link on
  a parent deck covers its subdecks. The sync endpoint does a full
  replace-for-day of that user's `ANKI`-sourced `StudyEvent`s, which makes
  re-syncing the same day idempotent without row-level reconciliation.
  The server side (API key, deck resolution, sync endpoint) is real and
  e2e-tested (`e2e/anki-sync.spec.ts`); `connector/sync.mjs` is real code
  against AnkiConnect's documented API but **was never run against a live
  Anki Desktop** in this environment — see `connector/README.md`'s status
  note before trusting it blindly.
- **SanarFlix**: no scraping, ever. Manual link/title/completion tracking
  via `StudySource` (`src/server/services/sources.ts`), managed from a
  topic's detail page; "Registrar tempo" is the one place a source logs
  minutes into `StudyEvent` (source: `MANUAL`) — toggling "completed"
  alone never creates an event, to avoid double-counting.
- **Motor de planejamento / recomendações** (brief §19-20, the product's
  actual thesis): `src/server/services/planning.ts`. A single, isolated,
  additive priority score over real signals (linked exam proximity,
  manual topic status, FSRS overdue/low-retention, subject priority) —
  never spread into components. Deliberately not normalized into a 0-100
  "readiness %"; it only needs to produce the right ORDER, not a
  calibrated confidence number. Dashboard's "Seu foco agora" card is a
  thin render of this — see `e2e/planning.spec.ts`, which replays the
  brief's own worked example.
- **AI (brief §21/§34)**: intentionally not implemented. No provider key
  was supplied and the brief is explicit that a fake/scripted "AI" is
  worse than none. What exists instead is the data foundation an AI
  feature would need: `StudyEvent`/`ReviewLog` are append-only history,
  not aggregates, specifically so a future model has real signal to work
  from (brief §48). Deterministic (non-AI) versions of two of the
  brief's proposed AI features already ship: "identify neglected
  subjects" and "suggest priorities" both live in `planning.ts` today.
  When an LLM integration is actually wanted: add a `src/server/services/ai/`
  namespace that *reads* through the existing services (never a parallel
  data path), keep provider credentials server-side only (never in a
  client component or a public env var), and keep the deterministic
  planning engine as the fallback/baseline rather than replacing it —
  an AI suggestion should augment `getFocusRecommendations`, not replace
  its reasoning with an opaque one.
- **Date-only form inputs (`<input type="date">`) must be parsed with
  `date-fns`'s `parseISO`, never `new Date(dateString)`.** The native
  constructor treats a bare `"YYYY-MM-DD"` as UTC midnight, so in any
  timezone behind UTC it silently shifts a day back once compared against
  local "now" (`differenceInCalendarDays`, overdue checks, etc.) —
  `e2e/exams.spec.ts` caught this as a real off-by-one on the exam
  countdown before the fix. `parseISO` interprets the same string as
  local midnight instead. Task/Exam due-date "overdue" checks also
  compare against `endOfDay(dueDate)`, not the date's midnight instant,
  so a task due "today" isn't overdue until today has actually passed.
- **Retention/forgetting-curve numbers must always be labeled as
  estimates**, never presented as measured fact for an individual user
  (brief section 46).
- **Quick-create `<form>`s reset synchronously, at submit time, not in a
  `.then()` after the server action resolves.** `formData` is already a
  frozen snapshot by the time the action function runs, so resetting the
  DOM form immediately is safe — resetting only after resolution left a
  window where a fast second submit's typed text got wiped by the first
  submit's delayed `reset()`, silently no-opping (empty name fails zod's
  `min(1)`). Every quick-create form (subjects, topics, tasks, exams,
  sources, Anki deck links) follows this pattern now; keep new ones
  consistent. See PROJECT_STATUS.md's Fase 25 notes for the full story,
  including the narrower edge case (rapid-fire automation navigating away
  mid-save) that's understood but not specifically engineered around.
- **Mobile bottom nav shows only `primary: true` items from
  `nav-items.ts` (currently 4) plus a "Mais" button** that opens a sheet
  with the rest — cramming all ~10 sections into one bottom bar overflows
  on a phone screen. Adding a new top-level section does NOT need
  `primary: true`; only mark it if it belongs in that scarce 4-item
  budget. Desktop sidebar still lists everything.
- **PWA** (brief §36): `src/app/manifest.ts` + `icon.tsx`/`apple-icon.tsx`
  (rendered with `next/og`, not static image files) + `public/sw.js`. The
  service worker only caches immutable static assets and shows an offline
  fallback on failed navigations — it never caches authenticated/dynamic
  responses (a stale or cross-session cached page would be a correctness
  and privacy bug, not just a convenience). Registered only in production
  to avoid fighting `next dev`'s HMR.

## Where things are

```
prisma/schema.prisma          data model (read the header comment)
src/lib/auth/                 password hashing, session cookies, api keys, actions, zod schemas
src/lib/db.ts                 Prisma client singleton
src/lib/exam-prep.ts          exam preparation % / status breakdown, shared by exam list + detail
src/server/services/          userId-scoped business logic (see its README) — one file per domain:
                               subjects, topics, tasks, exams, study-events, reviews (FSRS),
                               stats, schedule, knowledge-map, sources, anki-links, planning
src/app/(auth)/               login/register pages
src/app/(app)/                authenticated app shell + feature routes (one folder per nav item,
                               plus topics/[id] which isn't in the sidebar — reached via links)
src/app/api/anki/sync/        connector-facing API route (Bearer API key, not a session cookie)
src/components/ui/            small hand-built primitives (button, input, card, badge) — no shadcn CLI, no Radix yet
src/components/layout/        sidebar/bottom-nav/user-menu, shared app chrome
connector/                    standalone Node script + README — NOT part of the Next.js app,
                               run locally by the user against their own Anki Desktop
public/sw.js, public/offline.html   PWA service worker (see the PWA note above)
e2e/                          Playwright specs — one file per feature slice, plus global-teardown.ts
```

## Current state / what's next

See `PROJECT_STATUS.md` — kept up to date as phases land.
