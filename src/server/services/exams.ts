import "server-only";
import { db } from "@/lib/db";

export function listExams(userId: string) {
  return db.exam.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    include: {
      subject: { select: { id: true, name: true, color: true } },
      topics: { include: { topic: { select: { id: true, name: true, status: true } } } },
    },
  });
}

export function getExam(userId: string, examId: string) {
  return db.exam.findFirst({
    where: { id: examId, userId },
    include: {
      subject: { select: { id: true, name: true, color: true } },
      topics: { include: { topic: { select: { id: true, name: true, status: true } } } },
    },
  });
}

export type CreateExamInput = {
  subjectId: string;
  name: string;
  date: Date;
  location?: string;
  priority?: number;
  notes?: string;
};

export function createExam(userId: string, input: CreateExamInput) {
  return db.exam.create({
    data: {
      userId,
      subjectId: input.subjectId,
      name: input.name,
      date: input.date,
      location: input.location || null,
      priority: input.priority ?? 2,
      notes: input.notes || null,
    },
  });
}

export async function deleteExam(userId: string, examId: string) {
  const result = await db.exam.deleteMany({ where: { id: examId, userId } });
  if (result.count === 0) throw new Error("Prova não encontrada.");
}

export async function addExamTopic(userId: string, examId: string, topicId: string) {
  const [exam, topic] = await Promise.all([
    db.exam.findFirst({ where: { id: examId, userId } }),
    db.topic.findFirst({ where: { id: topicId, userId } }),
  ]);
  if (!exam || !topic) throw new Error("Prova ou tópico não encontrado.");

  await db.examTopic.upsert({
    where: { examId_topicId: { examId, topicId } },
    create: { examId, topicId },
    update: {},
  });
}

export async function removeExamTopic(userId: string, examId: string, topicId: string) {
  const exam = await db.exam.findFirst({ where: { id: examId, userId } });
  if (!exam) throw new Error("Prova não encontrada.");
  await db.examTopic.deleteMany({ where: { examId, topicId } });
}
