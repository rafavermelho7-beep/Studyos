"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import {
  createSubject,
  updateSubject,
  deleteSubject,
  setSubjectEmoji,
  applySuggestedEmojis,
} from "@/server/services/subjects";
import { createTopic, updateTopic, deleteTopic } from "@/server/services/topics";
import { removeSubjectCover, setSubjectCover } from "@/server/services/images";
import { readUploadedImage } from "@/lib/upload";

const quickCreateSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(120),
});

export async function quickCreateSubjectAction(formData: FormData) {
  const user = await requireUser();
  const parsed = quickCreateSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;

  await createSubject(user.id, { name: parsed.data.name });
  revalidatePath("/subjects");
  revalidatePath("/dashboard");
}

const subjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  professor: z.string().trim().max(120).optional(),
  semester: z.string().trim().max(60).optional(),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function updateSubjectAction(subjectId: string, formData: FormData) {
  const user = await requireUser();
  const parsed = subjectSchema.partial({ name: true }).safeParse({
    name: formData.get("name") || undefined,
    description: formData.get("description") || undefined,
    professor: formData.get("professor") || undefined,
    semester: formData.get("semester") || undefined,
    priority: formData.get("priority") || undefined,
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  await updateSubject(user.id, subjectId, parsed.data);
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath("/subjects");
  revalidatePath("/dashboard");
}

// Deleting from the item's own page redirects server-side: revalidating
// and then navigating client-side would first re-render the page that was
// just deleted (a flash of 404) before the push lands.
export async function deleteSubjectAction(subjectId: string) {
  const user = await requireUser();
  await deleteSubject(user.id, subjectId);
  revalidatePath("/subjects");
  revalidatePath("/dashboard");
  redirect("/subjects");
}

const topicSchema = z.object({
  subjectId: z.string().min(1),
  parentId: z.string().optional(),
  name: z.string().trim().min(1).max(160),
});

export async function createTopicAction(formData: FormData) {
  const user = await requireUser();
  const parsed = topicSchema.safeParse({
    subjectId: formData.get("subjectId"),
    parentId: formData.get("parentId") || undefined,
    name: formData.get("name"),
  });
  if (!parsed.success) return;

  await createTopic(user.id, parsed.data);
  revalidatePath(`/subjects/${parsed.data.subjectId}`);
  revalidatePath("/dashboard");
}

export async function updateTopicStatusAction(topicId: string, subjectId: string, status: string) {
  const user = await requireUser();
  const parsedStatus = z.enum(["NOVO", "APRENDENDO", "REVISANDO", "DOMINADO"]).parse(status);
  await updateTopic(user.id, topicId, { status: parsedStatus });
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath("/dashboard");
}

export async function deleteTopicAction(topicId: string, subjectId: string) {
  const user = await requireUser();
  await deleteTopic(user.id, topicId);
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath("/dashboard");
}

export async function deleteTopicFromDetailAction(topicId: string) {
  const user = await requireUser();
  const subjectId = await deleteTopic(user.id, topicId);
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath("/dashboard");
  redirect(`/subjects/${subjectId}`);
}

export async function setSubjectCoverAction(subjectId: string, formData: FormData) {
  const user = await requireUser();
  const upload = await readUploadedImage(formData);
  if ("error" in upload) return upload;
  try {
    await setSubjectCover(user.id, subjectId, upload.bytes);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível salvar a foto." };
  }
  revalidateSubjectCover(subjectId);
  return { error: null };
}

export async function removeSubjectCoverAction(subjectId: string) {
  const user = await requireUser();
  await removeSubjectCover(user.id, subjectId);
  revalidateSubjectCover(subjectId);
}

function revalidateSubjectCover(subjectId: string) {
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath("/subjects");
  revalidatePath("/dashboard");
}

export async function setSubjectEmojiAction(subjectId: string, emoji: string | null) {
  const user = await requireUser();
  await setSubjectEmoji(user.id, subjectId, emoji);
  revalidateSubjectCover(subjectId);
}

export async function applySuggestedEmojisAction() {
  const user = await requireUser();
  const count = await applySuggestedEmojis(user.id);
  revalidatePath("/subjects", "layout");
  revalidatePath("/dashboard");
  return count;
}
