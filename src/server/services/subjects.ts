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
  const result = await db.subject.deleteMany({ where: { id: subjectId, userId } });
  if (result.count === 0) throw new Error("Matéria não encontrada.");
}
