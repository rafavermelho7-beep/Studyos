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
