import "server-only";
import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { firstReviewAt, nextReviewState, type ErrorReason } from "@/lib/error-review";
import { validateImageBytes } from "@/server/services/images";

// Caderno de Erros (see the ErrorEntry model). userId-scoped like every
// service; subject/topic ids coming from the client are re-checked for
// ownership before they're stored.

const include = {
  subject: { select: { id: true, name: true, color: true, emoji: true } },
  topic: { select: { id: true, name: true } },
} as const;

export type ErrorFilters = { subjectId?: string; reason?: ErrorReason; status?: "active" | "mastered" | "all" };

export function listErrors(userId: string, filters: ErrorFilters = {}) {
  return db.errorEntry.findMany({
    where: {
      userId,
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.reason ? { reason: filters.reason } : {}),
      ...(filters.status === "mastered" ? { mastered: true } : filters.status === "all" ? {} : { mastered: false }),
    },
    orderBy: { createdAt: "desc" },
    include,
  });
}

export function listDueErrors(userId: string, now = new Date()) {
  return db.errorEntry.findMany({
    where: { userId, mastered: false, nextReviewAt: { lte: now } },
    orderBy: { nextReviewAt: "asc" },
    include,
  });
}

export function countDueErrors(userId: string, now = new Date()) {
  return db.errorEntry.count({ where: { userId, mastered: false, nextReviewAt: { lte: now } } });
}

/** Totals by reason and by subject — the "where am I losing points" view. */
export async function errorSummary(userId: string) {
  const [byReason, bySubject, total, mastered] = await Promise.all([
    db.errorEntry.groupBy({ by: ["reason"], where: { userId }, _count: { _all: true } }),
    db.errorEntry.groupBy({ by: ["subjectId"], where: { userId }, _count: { _all: true } }),
    db.errorEntry.count({ where: { userId } }),
    db.errorEntry.count({ where: { userId, mastered: true } }),
  ]);
  return {
    total,
    mastered,
    byReason: byReason.map((r) => ({ reason: r.reason, count: r._count._all })).sort((a, b) => b.count - a.count),
    bySubject: bySubject
      .map((s) => ({ subjectId: s.subjectId, count: s._count._all }))
      .sort((a, b) => b.count - a.count),
  };
}

export function getError(userId: string, errorId: string) {
  return db.errorEntry.findFirst({ where: { id: errorId, userId }, include });
}

export function listErrorsForTopic(userId: string, topicId: string) {
  return db.errorEntry.findMany({ where: { userId, topicId }, orderBy: { createdAt: "desc" }, include });
}

/** Unmastered errors logged in the last `days` days, per topic — a planning-engine signal. */
export async function recentErrorCountsByTopic(userId: string, days = 30, now = new Date()) {
  const rows = await db.errorEntry.groupBy({
    by: ["topicId"],
    where: { userId, mastered: false, topicId: { not: null }, createdAt: { gte: subDays(now, days) } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.topicId!, r._count._all]));
}

export type ErrorInput = {
  subjectId?: string | null;
  topicId?: string | null;
  source?: string | null;
  question?: string | null;
  reason: ErrorReason;
  lesson: string;
};

/** Checks subject/topic belong to the user (and to each other); a topic implies its subject. */
async function resolveLinks(userId: string, subjectId?: string | null, topicId?: string | null) {
  if (topicId) {
    const topic = await db.topic.findFirst({ where: { id: topicId, userId }, select: { subjectId: true } });
    if (!topic) throw new Error("Tópico não encontrado.");
    if (subjectId && subjectId !== topic.subjectId) throw new Error("O tópico não é dessa matéria.");
    return { subjectId: topic.subjectId, topicId };
  }
  if (subjectId) {
    const subject = await db.subject.findFirst({ where: { id: subjectId, userId }, select: { id: true } });
    if (!subject) throw new Error("Matéria não encontrada.");
    return { subjectId, topicId: null };
  }
  return { subjectId: null, topicId: null };
}

export async function createError(userId: string, input: ErrorInput, photo?: Uint8Array, now = new Date()) {
  if (!input.question && !photo) throw new Error("Escreva a questão ou tire uma foto dela.");
  const links = await resolveLinks(userId, input.subjectId, input.topicId);
  const contentType = photo ? validateImageBytes(photo) : null;

  return db.$transaction(async (tx) => {
    const image =
      photo && contentType
        ? await tx.image.create({
            data: { userId, contentType, byteSize: photo.length, data: Buffer.from(photo) },
            select: { id: true },
          })
        : null;
    return tx.errorEntry.create({
      data: {
        userId,
        ...links,
        source: input.source || null,
        question: input.question || null,
        imageId: image?.id ?? null,
        reason: input.reason,
        lesson: input.lesson,
        nextReviewAt: firstReviewAt(now),
      },
    });
  });
}

export async function updateError(userId: string, errorId: string, input: ErrorInput & { removePhoto?: boolean }) {
  const existing = await db.errorEntry.findFirst({ where: { id: errorId, userId }, select: { imageId: true } });
  if (!existing) throw new Error("Erro não encontrado.");
  if (!input.question && (!existing.imageId || input.removePhoto)) {
    throw new Error("Escreva a questão ou mantenha a foto.");
  }
  const links = await resolveLinks(userId, input.subjectId, input.topicId);
  await db.$transaction([
    db.errorEntry.updateMany({
      where: { id: errorId, userId },
      data: {
        ...links,
        source: input.source || null,
        question: input.question || null,
        reason: input.reason,
        lesson: input.lesson,
      },
    }),
    // Clearing ErrorEntry.imageId happens via onDelete: SetNull.
    ...(input.removePhoto && existing.imageId ? [db.image.deleteMany({ where: { id: existing.imageId, userId } })] : []),
  ]);
}

export async function reviewError(userId: string, errorId: string, gotItRight: boolean, now = new Date()) {
  const entry = await db.errorEntry.findFirst({ where: { id: errorId, userId }, select: { stage: true } });
  if (!entry) throw new Error("Erro não encontrado.");
  const next = nextReviewState(entry.stage, gotItRight, now);
  await db.errorEntry.updateMany({ where: { id: errorId, userId }, data: { ...next, lastReviewedAt: now } });
  return next;
}

/** Deletes the entry and its photo together — no orphaned Image rows. */
export async function deleteError(userId: string, errorId: string) {
  const entry = await db.errorEntry.findFirst({ where: { id: errorId, userId }, select: { imageId: true } });
  if (!entry) throw new Error("Erro não encontrado.");
  await db.$transaction([
    db.errorEntry.deleteMany({ where: { id: errorId, userId } }),
    ...(entry.imageId ? [db.image.deleteMany({ where: { id: entry.imageId, userId } })] : []),
  ]);
}
