import "server-only";
import { db } from "@/lib/db";

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
  const [topics, exams, reviews, studyEvents, tasks] = await Promise.all([
    db.topic.count({ where: { userId, subjectId } }),
    db.exam.count({ where: { userId, subjectId } }),
    db.reviewState.count({ where: { userId, topic: { subjectId } } }),
    db.studyEvent.count({ where: { userId, subjectId } }),
    db.task.count({ where: { userId, subjectId } }),
  ]);
  return { topics, exams, reviews, studyEvents, tasks };
}
