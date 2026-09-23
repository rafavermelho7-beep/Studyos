import "server-only";
import { db } from "@/lib/db";
import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  forgetting_curve,
  type Card,
  type Grade,
} from "ts-fsrs";
import type { ReviewCardState, ReviewState } from "@prisma/client";

// Topic-level review, not Anki-style minute-granularity flashcards, so we
// disable the short-term (re)learning steps — every interval FSRS proposes
// is at least a day. `enable_fuzz` spreads due dates so many topics graded
// together don't all pile up on the exact same future day.
const fsrsParams = generatorParameters({ enable_fuzz: true, enable_short_term: false });
const scheduler = fsrs(fsrsParams);

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
  // Ownership check is load-bearing, not incidental: reviewState.topicId is
  // globally unique (one row per topic, not per user), so the upsert below
  // is keyed on `topicId` alone. Without this check, grading a topicId you
  // don't own would silently overwrite the real owner's FSRS state via the
  // upsert's `update` branch — an IDOR, not just an empty result.
  const topic = await db.topic.findFirst({ where: { id: topicId, userId } });
  if (!topic) throw new Error("Tópico não encontrado.");

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

/**
 * Undo the most recent grade on a topic ("apertei Errei sem querer"), via
 * ts-fsrs's own `rollback`. Its ReviewLog captures the card as it was
 * BEFORE the grade (stability, difficulty, scheduled days...) — except our
 * `ReviewLog.state` column, which gradeReview fills with the state AFTER
 * it. So the pre-grade state is the previous log's `state` (or NEW if this
 * was the first grade). Returns false if there was nothing to undo.
 */
export async function undoLastReview(userId: string, topicId: string) {
  // Same load-bearing ownership check as gradeReview: the update below is
  // keyed on the globally-unique `topicId`.
  const topic = await db.topic.findFirst({ where: { id: topicId, userId } });
  if (!topic) throw new Error("Tópico não encontrado.");

  const [current, logs] = await Promise.all([
    db.reviewState.findFirst({ where: { userId, topicId } }),
    db.reviewLog.findMany({
      where: { userId, topicId },
      orderBy: [{ reviewedAt: "desc" }, { id: "desc" }],
      take: 2,
    }),
  ]);
  const [last, previous] = logs;
  if (!current || !last) return false;

  const card = scheduler.rollback(toFsrsCard(current), {
    rating: last.rating as Grade,
    state: STATE_TO_FSRS[previous?.state ?? "NEW"],
    due: last.due,
    stability: last.stability,
    difficulty: last.difficulty,
    elapsed_days: last.elapsedDays,
    last_elapsed_days: last.lastElapsedDays,
    scheduled_days: last.scheduledDays,
    learning_steps: 0,
    review: last.reviewedAt,
  });

  await db.$transaction([
    db.reviewLog.deleteMany({ where: { id: last.id, userId } }),
    db.reviewState.updateMany({
      where: { userId, topicId },
      data: {
        state: FSRS_TO_STATE[card.state],
        due: card.due,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsed_days,
        scheduledDays: card.scheduled_days,
        learningSteps: card.learning_steps,
        reps: card.reps,
        lapses: card.lapses,
        lastReview: card.last_review ?? null,
      },
    }),
  ]);
  return true;
}

/** Take a topic out of spaced review entirely, history included — it goes back to "iniciar revisão". */
export async function removeFromReview(userId: string, topicId: string) {
  await db.$transaction([
    db.reviewLog.deleteMany({ where: { userId, topicId } }),
    db.reviewState.deleteMany({ where: { userId, topicId } }),
  ]);
}

/** Estimated probability of recall right now, 0-1. Always an estimate — see brief §46/§19. */
export function estimateRetrievability(row: ReviewState, now = new Date()): number {
  return scheduler.get_retrievability(toFsrsCard(row), now, false);
}

export function countDueReviews(userId: string, now = new Date()) {
  return db.reviewState.count({ where: { userId, due: { lte: now } } });
}

export function getTopicReviewHistory(userId: string, topicId: string) {
  return db.reviewLog.findMany({
    where: { userId, topicId },
    orderBy: { reviewedAt: "asc" },
  });
}

export function getReviewState(userId: string, topicId: string) {
  return db.reviewState.findFirst({ where: { userId, topicId } });
}

/**
 * The stability the topic had going INTO its most recent review — the
 * input for the "sem a última revisão" curve. ts-fsrs logs capture the
 * card before each grade, so that's simply the newest log's stability.
 * (This used to read the second-newest log, which is the stability before
 * the review two grades back.) Null until there are two reviews: before
 * the first one there's no memory state to draw a curve from.
 */
export function stabilityBeforeLastReview(logsOldestFirst: { stability: number }[]): number | null {
  return logsOldestFirst.length >= 2 ? logsOldestFirst[logsOldestFirst.length - 1].stability : null;
}

/**
 * Two comparable retention projections, both estimates from the FSRS model
 * (brief §19/§46 — never presented as a measured fact for this individual):
 * `current` uses the stability the last review actually produced; `previous`
 * replays what the curve would have looked like without that last review
 * (the stability the topic had going into it), when there's enough history
 * to know that. Both are anchored at day 0 = the last review.
 */
export function getForgettingCurve(
  reviewState: ReviewState,
  previousStability: number | null,
  maxDays = 30,
) {
  const current: { day: number; retention: number }[] = [];
  const previous: { day: number; retention: number }[] = [];
  for (let day = 0; day <= maxDays; day++) {
    current.push({ day, retention: forgetting_curve(fsrsParams.w, day, reviewState.stability) });
    if (previousStability !== null) {
      previous.push({ day, retention: forgetting_curve(fsrsParams.w, day, previousStability) });
    }
  }
  return { current, previous: previousStability !== null ? previous : null };
}
