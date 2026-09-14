"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createAnkiDeckLink, deleteAnkiDeckLink } from "@/server/services/anki-links";

const schema = z.object({
  deckName: z.string().trim().min(1, "Informe o nome do deck").max(160),
  subjectId: z.string().min(1, "Escolha uma matéria"),
  topicId: z.string().optional(),
});

export async function createAnkiDeckLinkAction(formData: FormData) {
  const user = await requireUser();
  const parsed = schema.safeParse({
    deckName: formData.get("deckName"),
    subjectId: formData.get("subjectId"),
    topicId: formData.get("topicId") || undefined,
  });
  if (!parsed.success) return;

  await createAnkiDeckLink(user.id, parsed.data);
  revalidatePath("/settings");
}

export async function deleteAnkiDeckLinkAction(id: string) {
  const user = await requireUser();
  await deleteAnkiDeckLink(user.id, id);
  revalidatePath("/settings");
}
