import "server-only";
import { db } from "@/lib/db";
import type { ContentStatus } from "@prisma/client";

export type CreateTopicInput = {
  subjectId: string;
  parentId?: string | null;
  name: string;
  difficulty?: number;
  priority?: number;
  notes?: string;
};

export async function createTopic(userId: string, input: CreateTopicInput) {
  const subject = await db.subject.findFirst({ where: { id: input.subjectId, userId } });
  if (!subject) throw new Error("Matéria não encontrada.");

  if (input.parentId) {
    const parent = await db.topic.findFirst({ where: { id: input.parentId, userId } });
    if (!parent) throw new Error("Tópico pai não encontrado.");
  }

  return db.topic.create({
    data: {
      userId,
      subjectId: input.subjectId,
      parentId: input.parentId || null,
      name: input.name,
      difficulty: input.difficulty ?? 2,
      priority: input.priority ?? 2,
      notes: input.notes || null,
    },
  });
}

export type UpdateTopicInput = Partial<{
  name: string;
  status: ContentStatus;
  difficulty: number;
  priority: number;
  notes: string | null;
}>;

export async function updateTopic(userId: string, topicId: string, input: UpdateTopicInput) {
  const result = await db.topic.updateMany({ where: { id: topicId, userId }, data: input });
  if (result.count === 0) throw new Error("Tópico não encontrado.");
}

/** Returns the deleted topic's subjectId, so callers can send the user back to it. */
export async function deleteTopic(userId: string, topicId: string) {
  const topic = await db.topic.findFirst({ where: { id: topicId, userId }, select: { subjectId: true } });
  if (!topic) throw new Error("Tópico não encontrado.");
  await db.topic.deleteMany({ where: { id: topicId, userId } });
  return topic.subjectId;
}

export function listTopicsForUser(userId: string) {
  return db.topic.findMany({
    where: { userId },
    select: { id: true, name: true, subjectId: true, parentId: true },
    orderBy: { name: "asc" },
  });
}

export function getTopic(userId: string, topicId: string) {
  return db.topic.findFirst({
    where: { id: topicId, userId },
    include: {
      subject: true,
      children: { orderBy: { name: "asc" } },
      reviewState: true,
      studySources: { orderBy: { createdAt: "desc" } },
      studyEvents: { orderBy: { startedAt: "desc" }, take: 20 },
    },
  });
}
