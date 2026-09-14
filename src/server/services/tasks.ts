import "server-only";
import { endOfDay, isAfter } from "date-fns";
import { db } from "@/lib/db";
import type { Task, TaskPriority, TaskStatus } from "@prisma/client";

export type TaskWithMeta = Task & {
  subject: { id: string; name: string; color: string } | null;
  topic: { id: string; name: string } | null;
  overdue: boolean;
};

function withOverdue(task: Task & { subject: { id: string; name: string; color: string } | null; topic: { id: string; name: string } | null }): TaskWithMeta {
  return {
    ...task,
    // A task due "today" isn't overdue until the whole day has passed —
    // compare against the end of the due date, not its midnight instant.
    overdue: !!task.dueDate && isAfter(new Date(), endOfDay(task.dueDate)) && task.status !== "DONE",
  };
}

export async function listTasks(
  userId: string,
  filters?: { status?: TaskStatus; subjectId?: string },
): Promise<TaskWithMeta[]> {
  const tasks = await db.task.findMany({
    where: {
      userId,
      status: filters?.status,
      subjectId: filters?.subjectId,
    },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: {
      subject: { select: { id: true, name: true, color: true } },
      topic: { select: { id: true, name: true } },
    },
  });
  return tasks.map(withOverdue);
}

export type CreateTaskInput = {
  title: string;
  description?: string;
  subjectId?: string;
  topicId?: string;
  priority?: TaskPriority;
  dueDate?: Date;
  estimatedMinutes?: number;
  tags?: string;
};

export function createTask(userId: string, input: CreateTaskInput) {
  return db.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description || null,
      subjectId: input.subjectId || null,
      topicId: input.topicId || null,
      priority: input.priority ?? "MEDIUM",
      dueDate: input.dueDate ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      tags: input.tags || null,
    },
  });
}

export async function setTaskStatus(userId: string, taskId: string, status: TaskStatus) {
  const result = await db.task.updateMany({
    where: { id: taskId, userId },
    data: { status, completedAt: status === "DONE" ? new Date() : null },
  });
  if (result.count === 0) throw new Error("Tarefa não encontrada.");
}

export async function deleteTask(userId: string, taskId: string) {
  const result = await db.task.deleteMany({ where: { id: taskId, userId } });
  if (result.count === 0) throw new Error("Tarefa não encontrada.");
}
