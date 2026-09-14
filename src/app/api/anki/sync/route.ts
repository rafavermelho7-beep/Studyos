import { NextResponse } from "next/server";
import { z } from "zod";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import { authenticateApiKey } from "@/lib/auth/api-key";
import { db } from "@/lib/db";
import { resolveDeckLink } from "@/server/services/anki-links";

// Called by the StudyOS Local Connector (see /connector), never by the
// browser — authenticated with the per-user API key from Settings, not a
// session cookie. See CLAUDE.md's Anki integration notes for the full
// StudyOS Web -> Local Connector -> AnkiConnect architecture.

const reviewSchema = z.object({
  deckName: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  cardsReviewed: z.number().int().nonnegative(),
  timeSpentMs: z.number().int().nonnegative(),
});

const bodySchema = z.object({
  reviews: z.array(reviewSchema).max(1000),
});

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const user = await authenticateApiKey(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const byDate = new Map<string, typeof parsed.data.reviews>();
  for (const review of parsed.data.reviews) {
    const arr = byDate.get(review.date) ?? [];
    arr.push(review);
    byDate.set(review.date, arr);
  }

  let synced = 0;

  for (const [date, reviews] of byDate) {
    const day = parseISO(date);

    // Full replace-for-day: makes re-syncing the same day idempotent
    // without needing to reconcile individual rows (brief §32 — avoid
    // double counting).
    await db.studyEvent.deleteMany({
      where: { userId: user.id, source: "ANKI", startedAt: { gte: startOfDay(day), lte: endOfDay(day) } },
    });

    for (const review of reviews) {
      if (review.cardsReviewed === 0) continue;
      const link = await resolveDeckLink(user.id, review.deckName);
      await db.studyEvent.create({
        data: {
          userId: user.id,
          source: "ANKI",
          activityType: "REVIEW",
          subjectId: link?.subjectId ?? null,
          topicId: link?.topicId ?? null,
          startedAt: day,
          endedAt: day,
          durationSec: Math.round(review.timeSpentMs / 1000),
          metadata: JSON.stringify({ deckName: review.deckName, cardsReviewed: review.cardsReviewed }),
        },
      });
      synced += 1;
    }
  }

  return NextResponse.json({ synced, days: byDate.size });
}
