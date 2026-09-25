import "server-only";
import { db } from "@/lib/db";
import { isSubjectEmoji, suggestSubjectEmoji } from "@/lib/subject-emojis";

export function listSubjects(userId: string) {
  return db.subject.findMany({
    where: { userId },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { topics: true, tasks: true, exams: true } },
    },
  });
}

export function getSubject(userId: string, subjectId: string) {
  return db.subject.findFirst({
    where: { id: subjectId, userId },
    include: {
      topics: {
        where: { parentId: null },
        orderBy: [{ priority: "asc" }, { name: "asc" }],
        include: {
          children: { orderBy: { name: "asc" } },
          reviewState: true,
        },
      },
    },
  });
}

export type CreateSubjectInput = {
  name: string;
  description?: string;
  professor?: string;
  semester?: string;
  priority?: number;
  color?: string;
};

/** New subjects start with the emoji their name suggests ("Cardiologia" → 🫀); changeable any time. */
export function createSubject(userId: string, input: CreateSubjectInput) {
  return db.subject.create({
    data: {
      userId,
      name: input.name,
      description: input.description || null,
      professor: input.professor || null,
      semester: input.semester || null,
      priority: input.priority ?? 2,
      color: input.color ?? "#5b5bd6",
      emoji: suggestSubjectEmoji(input.name),
    },
  });
}

export type UpdateSubjectInput = Partial<CreateSubjectInput>;

export async function updateSubject(userId: string, subjectId: string, input: UpdateSubjectInput) {
  const result = await db.subject.updateMany({
    where: { id: subjectId, userId },
    data: input,
  });
  if (result.count === 0) throw new Error("Matéria não encontrada.");
}

export async function deleteSubject(userId: string, subjectId: string) {
  const subject = await db.subject.findFirst({ where: { id: subjectId, userId }, select: { coverImageId: true } });
  if (!subject) throw new Error("Matéria não encontrada.");
  // The cover photo is only referenced by this subject — delete it with it.
  await db.$transaction([
    db.subject.deleteMany({ where: { id: subjectId, userId } }),
    ...(subject.coverImageId ? [db.image.deleteMany({ where: { id: subject.coverImageId, userId } })] : []),
  ]);
}

/** What deleting a subject takes with it — shown in the confirmation before it happens. */
export async function getSubjectDeletionImpact(userId: string, subjectId: string) {
  // Topics, exams and review history cascade away; tasks, sources and
  // study events are kept with their subject set to null (schema onDelete).
  const [topics, exams, reviews, studyEvents, tasks, lessons] = await Promise.all([
    db.topic.count({ where: { userId, subjectId } }),
    db.exam.count({ where: { userId, subjectId } }),
    db.reviewState.count({ where: { userId, topic: { subjectId } } }),
    db.studyEvent.count({ where: { userId, subjectId } }),
    db.task.count({ where: { userId, subjectId } }),
    db.lesson.count({ where: { userId, subjectId } }),
  ]);
  return { topics, exams, reviews, studyEvents, tasks, lessons };
}

export async function setSubjectEmoji(userId: string, subjectId: string, emoji: string | null) {
  if (emoji !== null && !isSubjectEmoji(emoji)) throw new Error("Emoji inválido.");
  const result = await db.subject.updateMany({ where: { id: subjectId, userId }, data: { emoji } });
  if (result.count === 0) throw new Error("Matéria não encontrada.");
}

/** Fills in the suggested emoji for every subject that has none yet; returns how many changed. */
export async function applySuggestedEmojis(userId: string) {
  const subjects = await db.subject.findMany({ where: { userId, emoji: null }, select: { id: true, name: true } });
  const updates = subjects
    .map((s) => ({ id: s.id, emoji: suggestSubjectEmoji(s.name) }))
    .filter((u): u is { id: string; emoji: string } => u.emoji !== null);
  await db.$transaction(
    updates.map((u) => db.subject.updateMany({ where: { id: u.id, userId, emoji: null }, data: { emoji: u.emoji } })),
  );
  return updates.length;
}
