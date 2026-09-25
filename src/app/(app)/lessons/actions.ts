"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseISO } from "date-fns";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { requestOrigin } from "@/lib/request-origin";
import { getFileStorage } from "@/server/storage";
import {
  addLessonLink,
  confirmLessonUpload,
  createLesson,
  deleteLesson,
  deleteLessonAttachment,
  prepareLessonUpload,
  setLessonTopics,
  updateLesson,
} from "@/server/services/lessons";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const titleSchema = z.string().trim().min(1, "Dê um título à aula").max(160);
// Same rule as study sources: rendered into an <a href>, so http(s) only.
const httpUrlSchema = z
  .string()
  .trim()
  .url("Link inválido")
  .refine((url) => /^https?:\/\//i.test(url), "O link precisa começar com http:// ou https://");

function revalidateLesson(lessonId: string, subjectId?: string) {
  revalidatePath(`/lessons/${lessonId}`);
  revalidatePath("/lessons");
  revalidatePath("/dashboard");
  if (subjectId) revalidatePath(`/subjects/${subjectId}`);
}

/** Best effort: a leftover object only costs storage, so never fail the user's action over it. */
async function removeFiles(paths: string[]) {
  if (paths.length === 0) return;
  try {
    await getFileStorage(await requestOrigin()).remove(paths);
  } catch (error) {
    console.error("[lessons] failed to remove stored files", paths, error);
  }
}

export async function createLessonAction(subjectId: string, formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({ title: titleSchema, date: dateSchema }).safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const lesson = await createLesson(user.id, { subjectId, title: parsed.data.title, date: parseISO(parsed.data.date) });
  revalidateLesson(lesson.id, subjectId);
  // Straight to the new lesson, where the files go.
  redirect(`/lessons/${lesson.id}`);
}

export async function updateLessonAction(lessonId: string, formData: FormData) {
  const user = await requireUser();
  const parsed = z
    .object({ title: titleSchema, date: dateSchema, notes: z.string().max(5000) })
    .safeParse({ title: formData.get("title"), date: formData.get("date"), notes: formData.get("notes") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  await updateLesson(user.id, lessonId, {
    title: parsed.data.title,
    date: parseISO(parsed.data.date),
    notes: parsed.data.notes.trim() || null,
  });
  revalidateLesson(lessonId);
  return { error: null };
}

export async function deleteLessonAction(lessonId: string) {
  const user = await requireUser();
  const { subjectId, storagePaths } = await deleteLesson(user.id, lessonId);
  await removeFiles(storagePaths);
  revalidateLesson(lessonId, subjectId);
  redirect(`/subjects/${subjectId}`);
}

export async function setLessonTopicsAction(lessonId: string, topicIds: string[]) {
  const user = await requireUser();
  await setLessonTopics(user.id, lessonId, z.array(z.string()).max(200).parse(topicIds));
  revalidateLesson(lessonId);
}

export async function addLessonLinkAction(lessonId: string, formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({ url: httpUrlSchema, name: z.string().trim().max(120) }).safeParse({
    url: formData.get("url"),
    name: formData.get("name") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Link inválido." };
  const name = parsed.data.name || new URL(parsed.data.url).hostname.replace(/^www\./, "");
  await addLessonLink(user.id, lessonId, { name, url: parsed.data.url });
  revalidateLesson(lessonId);
  return { error: null };
}

const fileMetaSchema = z.object({
  name: z.string().min(1).max(200),
  size: z.number().int().positive(),
  type: z.string().max(200),
});

/** Upload step 1: a signed URL the browser PUTs the file to directly (bypasses Vercel's body limit). */
export async function startLessonUploadAction(lessonId: string, file: { name: string; size: number; type: string }) {
  const user = await requireUser();
  try {
    const storagePath = await prepareLessonUpload(user.id, lessonId, fileMetaSchema.parse(file));
    const uploadUrl = await getFileStorage(await requestOrigin()).createUploadUrl(storagePath);
    return { uploadUrl, storagePath, error: null };
  } catch (error) {
    return { uploadUrl: null, storagePath: null, error: error instanceof Error ? error.message : "Falha ao preparar o envio." };
  }
}

/** Upload step 2: record it only after checking what actually landed in Storage. */
export async function finishLessonUploadAction(lessonId: string, input: { storagePath: string; name: string }) {
  const user = await requireUser();
  const storage = getFileStorage(await requestOrigin());
  const attachment = await confirmLessonUpload(user.id, lessonId, input, await storage.stat(input.storagePath));
  if (!attachment) {
    // Only ever delete inside this user's own folder.
    if (input.storagePath.startsWith(`${user.id}/${lessonId}/`)) await removeFiles([input.storagePath]);
    return { error: "O arquivo não foi aceito (tipo ou tamanho inválido). Tente de novo." };
  }
  revalidateLesson(lessonId);
  return { error: null };
}

export async function deleteLessonAttachmentAction(attachmentId: string) {
  const user = await requireUser();
  const { storagePath, lessonId } = await deleteLessonAttachment(user.id, attachmentId);
  if (storagePath) await removeFiles([storagePath]);
  revalidateLesson(lessonId);
}
