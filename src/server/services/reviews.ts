import "server-only";
import { db } from "@/lib/db";
import { fsrs, generatorParameters, createEmptyCard, type Card, type Grade } from "ts-fsrs";
import type { ReviewCardState, ReviewState } from "@prisma/client";

// Topic-level review, not Anki-style minute-granularity flashcards, so we
// disable the short-term (re)learning steps — every interval FSRS proposes
// is at least a day. `enable_fuzz` spreads due dates so many topics graded
// together don't all pile up on the exact same future day.
const scheduler = fsrs(generatorParameters({ enable_fuzz: true, enable_short_term: false }));

const STATE_TO_FSRS: Record<ReviewCardState, number> = { NEW: 0, LEARNING: 1, REVIEW: 2, RELEARNING: 3 };
const FSRS_TO_STATE: ReviewCardState[] = ["NEW", "LEARNING", "REVIEW", "RELEARNING"];

function toFsrsCard(row: ReviewState | null): Card {
  if (!row) return createEmptyCard(new Date());
  return {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    learning_steps: row.learningSteps,
    reps: row.reps,
    lapses: row.lapses,
    state: STATE_TO_FSRS[row.state],
    last_review: row.lastReview ?? undefined,
  };
}

export function listDueReviews(userId: string, now = new Date()) {
  return db.reviewState.findMany({
    where: { userId, due: { lte: now } },
    orderBy: { due: "asc" },
    include: { topic: { include: { subject: { select: { id: true, name: true, color: true } } } } },
  });
}

export function listReviewableTopics(userId: string) {
  // Topics that have never entered the FSRS queue yet.
  return db.topic.findMany({
    where: { userId, reviewState: null },
    select: { id: true, name: true, subjectId: true, subject: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
}

export async function startReview(userId: string, topicId: string) {
  const topic = await db.topic.findFirst({ where: { id: topicId, userId } });
  if (!topic) throw new Error("Tópico não encontrado.");

  const card = createEmptyCard(new Date());
  await db.reviewState.upsert({
    where: { topicId },
    create: {
      userId,
      topicId,
      state: "NEW",
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsedDays: card.elapsed_days,
      scheduledDays: card.scheduled_days,
      learningSteps: card.learning_steps,
      reps: card.reps,
      lapses: card.lapses,
    },
    update: {},
  });
}

/** 1=Again 2=Hard 3=Good 4=Easy, per ts-fsrs Rating enum. */
export async function gradeReview(userId: string, topicId: string, rating: Grade) {
  const existing = await db.reviewState.findFirst({ where: { userId, topicId } });
  const before = toFsrsCard(existing);
  const now = new Date();

  const { card, log } = scheduler.next(before, now, rating);
  const state = FSRS_TO_STATE[card.state];

  await db.$transaction([
    db.reviewState.upsert({
      where: { topicId },
      create: {
        userId,
        topicId,
        state,
        due: card.due,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsed_days,
        scheduledDays: card.scheduled_days,
        learningSteps: card.learning_steps,
        reps: card.reps,
        lapses: card.lapses,
        lastReview: now,
      },
      update: {
        state,
        due: card.due,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsed_days,
        scheduledDays: card.scheduled_days,
        learningSteps: card.learning_steps,
        reps: card.reps,
        lapses: card.lapses,
        lastReview: now,
      },
    }),
    db.reviewLog.create({
      data: {
        userId,
        topicId,
        rating,
        state,
        due: log.due,
        stability: log.stability,
        difficulty: log.difficulty,
        elapsedDays: log.elapsed_days,
        lastElapsedDays: log.last_elapsed_days,
        scheduledDays: log.scheduled_days,
        reviewedAt: now,
      },
    }),
  ]);

  return { nextDue: card.due, state };
}

/** Estimated probability of recall right now, 0-1. Always an estimate — see brief §46/§19. */
export function estimateRetrievability(row: ReviewState, now = new Date()): number {
  return scheduler.get_retrievability(toFsrsCard(row), now, false);
}

export function countDueReviews(userId: string, now = new Date()) {
  return db.reviewState.count({ where: { userId, due: { lte: now } } });
}
