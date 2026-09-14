import "server-only";
import { db } from "@/lib/db";
import type { SourceType } from "@prisma/client";

export function listTopicSources(userId: string, topicId: string) {
  return db.studySource.findMany({
    where: { userId, topicId },
    orderBy: { createdAt: "desc" },
  });
}

export function listAllSources(userId: string) {
  return db.studySource.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      subject: { select: { id: true, name: true, color: true } },
      topic: { select: { id: true, name: true } },
    },
  });
}

export type CreateSourceInput = {
  type: SourceType;
  title: string;
  url?: string;
  subjectId?: string;
  topicId?: string;
  manualMinutes?: number;
};

export function createSource(userId: string, input: CreateSourceInput) {
  return db.studySource.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      url: input.url || null,
      subjectId: input.subjectId || null,
      topicId: input.topicId || null,
      manualMinutes: input.manualMinutes ?? null,
    },
  });
}

export async function toggleSourceCompleted(userId: string, sourceId: string, completed: boolean) {
  const result = await db.studySource.updateMany({
    where: { id: sourceId, userId },
    data: { completed },
  });
  if (result.count === 0) throw new Error("Fonte não encontrada.");
}

export async function deleteSource(userId: string, sourceId: string) {
  const result = await db.studySource.deleteMany({ where: { id: sourceId, userId } });
  if (result.count === 0) throw new Error("Fonte não encontrada.");
}

/**
 * Logs manually-reported time from an external source (SanarFlix, a video,
 * a book, ...) as a real StudyEvent so it counts toward stats/dashboard
 * like any other studied minute — see brief §28 "Study Events" and §32
 * "evitar dupla contagem" (this is the ONE place a source's time enters
 * StudyEvent; toggling "completed" alone never creates an event).
 */
export async function logSourceTime(userId: string, sourceId: string, minutes: number) {
  const source = await db.studySource.findFirst({ where: { id: sourceId, userId } });
  if (!source) throw new Error("Fonte não encontrada.");
  if (minutes <= 0) throw new Error("Duração inválida.");

  const now = new Date();
  await db.studyEvent.create({
    data: {
      userId,
      source: "MANUAL",
      activityType: sourceTypeToActivity(source.type),
      subjectId: source.subjectId,
      topicId: source.topicId,
      startedAt: now,
      endedAt: now,
      durationSec: minutes * 60,
      notes: `Fonte: ${source.title}`,
    },
  });
}

function sourceTypeToActivity(type: SourceType) {
  if (type === "SANARFLIX" || type === "YOUTUBE" || type === "CLASS") return "VIDEO" as const;
  if (type === "QUESTIONS") return "QUESTIONS" as const;
  if (type === "ANKI" || type === "FLASHCARDS") return "REVIEW" as const;
  return "READING" as const;
}
