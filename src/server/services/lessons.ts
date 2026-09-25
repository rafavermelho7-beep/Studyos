import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  ALLOWED_LESSON_FILE_TYPES,
  LESSON_FILES_QUOTA_BYTES,
  MAX_LESSON_FILE_BYTES,
} from "@/server/storage/types";

// Aulas: a per-subject class diary + its materials (see the Lesson model).
// Services own the data rules; the actual Storage calls happen in the
// server actions (they need the request origin for the dev driver) —
// functions that delete files RETURN the storage paths for the caller to
// remove after the DB rows are gone.

const subjectSelect = { select: { id: true, name: true, color: true, emoji: true } } as const;

async function ownLesson(userId: string, lessonId: string) {
  const lesson = await db.lesson.findFirst({ where: { id: lessonId, userId }, select: { id: true, subjectId: true } });
  if (!lesson) throw new Error("Aula não encontrada.");
  return lesson;
}

export function listLessonsForSubject(userId: string, subjectId: string) {
  return db.lesson.findMany({
    where: { userId, subjectId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { attachments: true } } },
  });
}

export function listRecentLessons(userId: string, take = 50) {
  return db.lesson.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    include: { subject: subjectSelect, _count: { select: { attachments: true } } },
  });
}

export function listLessonsForTopic(userId: string, topicId: string) {
  return db.lesson.findMany({
    where: { userId, topics: { some: { topicId } } },
    orderBy: { date: "desc" },
    include: { attachments: { orderBy: { createdAt: "asc" } } },
  });
}

export function getLesson(userId: string, lessonId: string) {
  return db.lesson.findFirst({
    where: { id: lessonId, userId },
    include: {
      subject: { select: { ...subjectSelect.select, topics: { select: { id: true, name: true }, orderBy: { name: "asc" } } } },
      attachments: { orderBy: { createdAt: "asc" } },
      topics: { select: { topicId: true } },
    },
  });
}

export async function createLesson(userId: string, input: { subjectId: string; date: Date; title: string }) {
  const subject = await db.subject.findFirst({ where: { id: input.subjectId, userId }, select: { id: true } });
  if (!subject) throw new Error("Matéria não encontrada.");
  return db.lesson.create({ data: { userId, subjectId: input.subjectId, date: input.date, title: input.title } });
}

export async function updateLesson(
  userId: string,
  lessonId: string,
  input: Partial<{ title: string; date: Date; notes: string | null }>,
) {
  const result = await db.lesson.updateMany({ where: { id: lessonId, userId }, data: input });
  if (result.count === 0) throw new Error("Aula não encontrada.");
}

/** Deletes the lesson; returns its files' storage paths for the caller to remove. */
export async function deleteLesson(userId: string, lessonId: string) {
  const lesson = await ownLesson(userId, lessonId);
  const files = await db.lessonAttachment.findMany({
    where: { lessonId, userId, storagePath: { not: null } },
    select: { storagePath: true },
  });
  await db.lesson.deleteMany({ where: { id: lessonId, userId } });
  return { subjectId: lesson.subjectId, storagePaths: files.map((f) => f.storagePath!) };
}

export async function setLessonTopics(userId: string, lessonId: string, topicIds: string[]) {
  const lesson = await ownLesson(userId, lessonId);
  // Only the caller's own topics, and only from this lesson's subject.
  const valid = await db.topic.findMany({
    where: { id: { in: topicIds }, userId, subjectId: lesson.subjectId },
    select: { id: true },
  });
  await db.$transaction([
    db.lessonTopic.deleteMany({ where: { lessonId } }),
    db.lessonTopic.createMany({ data: valid.map((t) => ({ lessonId, topicId: t.id })) }),
  ]);
}

export async function addLessonLink(userId: string, lessonId: string, input: { name: string; url: string }) {
  await ownLesson(userId, lessonId);
  return db.lessonAttachment.create({ data: { userId, lessonId, kind: "LINK", name: input.name, url: input.url } });
}

export async function lessonStorageUsage(userId: string) {
  const result = await db.lessonAttachment.aggregate({ where: { userId, kind: "FILE" }, _sum: { byteSize: true } });
  return result._sum.byteSize ?? 0;
}

function safeFileName(name: string) {
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return base.replace(/^-+|-+$/g, "").slice(-80) || "arquivo";
}

/**
 * Step 1 of an upload: checks what the browser SAYS it will send (type,
 * size, quota) and picks where it goes. Step 2 (confirmLessonUpload)
 * re-checks what actually arrived.
 */
export async function prepareLessonUpload(
  userId: string,
  lessonId: string,
  file: { name: string; size: number; type: string },
) {
  await ownLesson(userId, lessonId);
  if (!(file.type in ALLOWED_LESSON_FILE_TYPES)) {
    throw new Error("Tipo de arquivo não suportado. Envie PDF, PowerPoint, Word ou imagem.");
  }
  if (file.size <= 0 || file.size > MAX_LESSON_FILE_BYTES) throw new Error("Arquivo acima de 50 MB.");
  if ((await lessonStorageUsage(userId)) + file.size > LESSON_FILES_QUOTA_BYTES) {
    throw new Error("Seu espaço de 1 GB para arquivos está cheio. Exclua arquivos antigos para liberar.");
  }
  return `${userId}/${lessonId}/${randomUUID()}-${safeFileName(file.name)}`;
}

/**
 * Step 2: records the file only if the object really exists at a path this
 * user/lesson owns, with an allowed type and size. On `null` the caller
 * must delete the object (it was bad, or not ours to claim).
 */
export async function confirmLessonUpload(
  userId: string,
  lessonId: string,
  input: { storagePath: string; name: string },
  stored: { size: number; contentType: string } | null,
) {
  await ownLesson(userId, lessonId);
  if (!input.storagePath.startsWith(`${userId}/${lessonId}/`) || input.storagePath.includes("..")) return null;
  if (!stored || stored.size > MAX_LESSON_FILE_BYTES || !(stored.contentType in ALLOWED_LESSON_FILE_TYPES)) return null;
  return db.lessonAttachment.create({
    data: {
      userId,
      lessonId,
      kind: "FILE",
      name: input.name.slice(0, 200),
      storagePath: input.storagePath,
      contentType: stored.contentType,
      byteSize: stored.size,
    },
  });
}

/** Returns the storage path (if it was a file) for the caller to remove. */
export async function deleteLessonAttachment(userId: string, attachmentId: string) {
  const attachment = await db.lessonAttachment.findFirst({
    where: { id: attachmentId, userId },
    select: { storagePath: true, lessonId: true },
  });
  if (!attachment) throw new Error("Anexo não encontrado.");
  await db.lessonAttachment.deleteMany({ where: { id: attachmentId, userId } });
  return attachment;
}

export function getLessonAttachment(userId: string, attachmentId: string) {
  return db.lessonAttachment.findFirst({ where: { id: attachmentId, userId } });
}

/** Every stored file under a subject — collected before a subject delete cascades them away. */
export async function lessonFilePathsForSubject(userId: string, subjectId: string) {
  const files = await db.lessonAttachment.findMany({
    where: { userId, storagePath: { not: null }, lesson: { subjectId } },
    select: { storagePath: true },
  });
  return files.map((f) => f.storagePath!);
}
