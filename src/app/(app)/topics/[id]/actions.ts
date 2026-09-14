"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import {
  createSource,
  toggleSourceCompleted,
  deleteSource,
  logSourceTime,
} from "@/server/services/sources";

const sourceTypes = [
  "ANKI",
  "SANARFLIX",
  "YOUTUBE",
  "PDF",
  "BOOK",
  "COURSE",
  "QUESTIONS",
  "CLASS",
  "FLASHCARDS",
  "OTHER",
] as const;

const createSourceSchema = z.object({
  type: z.enum(sourceTypes),
  title: z.string().trim().min(1, "Informe um título").max(160),
  url: z.string().trim().url("URL inválida").optional().or(z.literal("")),
});

export async function createSourceAction(topicId: string, subjectId: string, formData: FormData) {
  const user = await requireUser();
  const parsed = createSourceSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    url: formData.get("url") || undefined,
  });
  if (!parsed.success) return;

  await createSource(user.id, {
    type: parsed.data.type,
    title: parsed.data.title,
    url: parsed.data.url || undefined,
    topicId,
    subjectId,
  });
  revalidatePath(`/topics/${topicId}`);
  revalidatePath("/sources");
}

export async function toggleSourceCompletedAction(sourceId: string, topicId: string, completed: boolean) {
  const user = await requireUser();
  await toggleSourceCompleted(user.id, sourceId, completed);
  revalidatePath(`/topics/${topicId}`);
  revalidatePath("/sources");
}

export async function deleteSourceAction(sourceId: string, topicId: string) {
  const user = await requireUser();
  await deleteSource(user.id, sourceId);
  revalidatePath(`/topics/${topicId}`);
  revalidatePath("/sources");
}

export async function logSourceTimeAction(sourceId: string, topicId: string, minutes: number) {
  const user = await requireUser();
  const parsedMinutes = z.number().int().positive().max(600).parse(minutes);
  await logSourceTime(user.id, sourceId, parsedMinutes);
  revalidatePath(`/topics/${topicId}`);
  revalidatePath("/dashboard");
  revalidatePath("/stats");
}
