"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { ERROR_REASON_KEYS, type ErrorReason } from "@/lib/error-review";
import { createError, deleteError, reviewError, updateError } from "@/server/services/errors";

const errorSchema = z.object({
  subjectId: z.string().optional(),
  topicId: z.string().optional(),
  source: z.string().trim().max(120).optional(),
  question: z.string().trim().max(5000).optional(),
  reason: z.enum(ERROR_REASON_KEYS as [ErrorReason, ...ErrorReason[]], { message: "Escolha por que errou" }),
  lesson: z.string().trim().min(1, "Escreva o que você aprendeu").max(2000),
});

function parse(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() ? value : undefined;
  };
  return errorSchema.safeParse({
    subjectId: text("subjectId"),
    topicId: text("topicId"),
    source: text("source"),
    question: text("question"),
    reason: text("reason"),
    lesson: text("lesson") ?? "",
  });
}

function revalidateErrors(topicId?: string | null) {
  revalidatePath("/errors");
  revalidatePath("/dashboard");
  if (topicId) revalidatePath(`/topics/${topicId}`);
}

export async function createErrorAction(formData: FormData) {
  const user = await requireUser();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  // Already resized/compressed in the browser; services/images re-validates the bytes.
  const photo = formData.get("image");
  const bytes = photo instanceof Blob && photo.size > 0 ? new Uint8Array(await photo.arrayBuffer()) : undefined;
  try {
    await createError(user.id, parsed.data, bytes);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível salvar." };
  }
  revalidateErrors(parsed.data.topicId);
  return { error: null };
}

export async function updateErrorAction(errorId: string, formData: FormData) {
  const user = await requireUser();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    await updateError(user.id, errorId, { ...parsed.data, removePhoto: formData.get("removePhoto") === "on" });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível salvar." };
  }
  revalidateErrors(parsed.data.topicId);
  redirect("/errors");
}

export async function reviewErrorAction(errorId: string, gotItRight: boolean) {
  const user = await requireUser();
  const result = await reviewError(user.id, errorId, z.boolean().parse(gotItRight));
  revalidateErrors();
  return result;
}

export async function deleteErrorAction(errorId: string) {
  const user = await requireUser();
  await deleteError(user.id, errorId);
  revalidateErrors();
}
