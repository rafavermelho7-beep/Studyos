"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseISO } from "date-fns";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createExam, deleteExam, addExamTopic, removeExamTopic } from "@/server/services/exams";

const createExamSchema = z.object({
  subjectId: z.string().min(1, "Escolha uma matéria"),
  name: z.string().trim().min(1, "Informe o nome da prova").max(160),
  date: z.string().min(1, "Informe a data"),
  location: z.string().trim().max(160).optional(),
});

export async function createExamAction(formData: FormData) {
  const user = await requireUser();
  const parsed = createExamSchema.safeParse({
    subjectId: formData.get("subjectId"),
    name: formData.get("name"),
    date: formData.get("date"),
    location: formData.get("location") || undefined,
  });
  if (!parsed.success) return;

  await createExam(user.id, {
    subjectId: parsed.data.subjectId,
    name: parsed.data.name,
    date: parseISO(parsed.data.date),
    location: parsed.data.location,
  });
  revalidatePath("/exams");
  revalidatePath("/dashboard");
}

export async function deleteExamAction(examId: string) {
  const user = await requireUser();
  await deleteExam(user.id, examId);
  revalidatePath("/exams");
  revalidatePath("/dashboard");
}

/** Same, from the exam's own page — redirects server-side (see deleteSubjectAction). */
export async function deleteExamFromDetailAction(examId: string) {
  await deleteExamAction(examId);
  redirect("/exams");
}

export async function addExamTopicAction(examId: string, topicId: string) {
  const user = await requireUser();
  await addExamTopic(user.id, examId, topicId);
  revalidatePath(`/exams/${examId}`);
}

export async function removeExamTopicAction(examId: string, topicId: string) {
  const user = await requireUser();
  await removeExamTopic(user.id, examId, topicId);
  revalidatePath(`/exams/${examId}`);
}
