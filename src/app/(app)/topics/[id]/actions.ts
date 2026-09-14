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

// zod's .url() only checks URL syntax, not scheme — "javascript:alert(1)"
// passes it, since the URL constructor accepts any scheme. This field is
// rendered straight into an <a href>, so restrict it to http(s) or a click
// would execute arbitrary script in the viewer's session (stored XSS,
// scoped to the user who entered it here, but still a real bug to close).
const httpUrlSchema = z
  .string()
  .trim()
  .url("URL inválida")
  .refine((url) => /^https?:\/\//i.test(url), "A URL precisa começar com http:// ou https://");

const createSourceSchema = z.object({
  type: z.enum(sourceTypes),
  title: z.string().trim().min(1, "Informe um título").max(160),
  url: httpUrlSchema.optional().or(z.literal("")),
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
