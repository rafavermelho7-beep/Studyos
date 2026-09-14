"use server";

import { revalidatePath } from "next/cache";
import { parseISO } from "date-fns";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createTask, setTaskStatus, deleteTask } from "@/server/services/tasks";

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(200),
  subjectId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().optional(),
  estimatedMinutes: z.coerce.number().int().positive().optional(),
});

export async function createTaskAction(formData: FormData) {
  const user = await requireUser();
  const raw = {
    title: formData.get("title"),
    subjectId: formData.get("subjectId") || undefined,
    priority: formData.get("priority") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    estimatedMinutes: formData.get("estimatedMinutes") || undefined,
  };
  const parsed = createTaskSchema.safeParse(raw);
  if (!parsed.success) return;

  await createTask(user.id, {
    title: parsed.data.title,
    subjectId: parsed.data.subjectId,
    priority: parsed.data.priority,
    dueDate: parsed.data.dueDate ? parseISO(parsed.data.dueDate) : undefined,
    estimatedMinutes: parsed.data.estimatedMinutes,
  });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

const statusEnum = z.enum(["TODO", "IN_PROGRESS", "DONE"]);

export async function setTaskStatusAction(taskId: string, status: string) {
  const user = await requireUser();
  await setTaskStatus(user.id, taskId, statusEnum.parse(status));
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTaskAction(taskId: string) {
  const user = await requireUser();
  await deleteTask(user.id, taskId);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
