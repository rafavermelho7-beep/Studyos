import "server-only";
import { db } from "@/lib/db";
import type { ActivityType, EventSource } from "@prisma/client";

export type LogStudyEventInput = {
  source?: EventSource;
  activityType?: ActivityType;
  subjectId?: string;
  topicId?: string;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
  goal?: string;
  notes?: string;
};

export function logStudyEvent(userId: string, input: LogStudyEventInput) {
  if (input.durationSec <= 0) throw new Error("Duração inválida.");
  return db.studyEvent.create({
    data: {
      userId,
      source: input.source ?? "STUDYOS",
      activityType: input.activityType ?? "SESSION",
      subjectId: input.subjectId || null,
      topicId: input.topicId || null,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationSec: Math.round(input.durationSec),
      goal: input.goal || null,
      notes: input.notes || null,
    },
  });
}

export function listRecentStudyEvents(userId: string, limit = 8) {
  return db.studyEvent.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: limit,
    include: {
      subject: { select: { id: true, name: true, color: true } },
      topic: { select: { id: true, name: true } },
    },
  });
}

export async function getTodayStudySeconds(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const result = await db.studyEvent.aggregate({
    where: { userId, startedAt: { gte: startOfDay } },
    _sum: { durationSec: true },
  });
  return result._sum.durationSec ?? 0;
}

// Correcting a mistaken record (timer left running, logged to the wrong
// subject) — not an aggregate counter, so the "events, not aggregates"
// rule still holds: stats keep deriving from whatever rows remain.
// ANKI rows are off-limits: /api/anki/sync replaces the whole day on every
// sync, so an edit would silently come back. Fix those in Anki instead.

export async function deleteStudyEvent(userId: string, eventId: string) {
  const result = await db.studyEvent.deleteMany({ where: { id: eventId, userId, source: { not: "ANKI" } } });
  if (result.count === 0) throw new Error("Sessão não encontrada.");
}

export async function updateStudyEventDuration(userId: string, eventId: string, durationSec: number) {
  if (durationSec <= 0) throw new Error("Duração inválida.");
  const event = await db.studyEvent.findFirst({
    where: { id: eventId, userId, source: { not: "ANKI" } },
    select: { startedAt: true },
  });
  if (!event) throw new Error("Sessão não encontrada.");
  await db.studyEvent.updateMany({
    where: { id: eventId, userId },
    data: {
      durationSec: Math.round(durationSec),
      endedAt: new Date(event.startedAt.getTime() + durationSec * 1000),
    },
  });
}
