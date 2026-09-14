import "server-only";
import { db } from "@/lib/db";

export function listAnkiDeckLinks(userId: string) {
  return db.ankiDeckLink.findMany({
    where: { userId },
    orderBy: { deckName: "asc" },
    include: {
      subject: { select: { id: true, name: true, color: true } },
      topic: { select: { id: true, name: true } },
    },
  });
}

export type CreateAnkiDeckLinkInput = {
  deckName: string;
  subjectId: string;
  topicId?: string;
};

export async function createAnkiDeckLink(userId: string, input: CreateAnkiDeckLinkInput) {
  const subject = await db.subject.findFirst({ where: { id: input.subjectId, userId } });
  if (!subject) throw new Error("Matéria não encontrada.");

  return db.ankiDeckLink.upsert({
    where: { userId_deckName: { userId, deckName: input.deckName } },
    create: { userId, deckName: input.deckName, subjectId: input.subjectId, topicId: input.topicId || null },
    update: { subjectId: input.subjectId, topicId: input.topicId || null },
  });
}

export async function deleteAnkiDeckLink(userId: string, id: string) {
  const result = await db.ankiDeckLink.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new Error("Vínculo não encontrado.");
}

/**
 * Finds the mapping for an Anki deck name, walking up the "::" hierarchy
 * (e.g. "Cardio::Arritmias::Bradicardias" falls back to "Cardio::Arritmias"
 * then "Cardio") since a link on a parent deck should cover its subdecks
 * (brief §27 — deck != subject isn't assumed, but a deck tree usually maps
 * to one branch of the subject/topic tree).
 */
export async function resolveDeckLink(userId: string, deckName: string) {
  const parts = deckName.split("::");
  for (let i = parts.length; i > 0; i--) {
    const candidate = parts.slice(0, i).join("::");
    const link = await db.ankiDeckLink.findUnique({ where: { userId_deckName: { userId, deckName: candidate } } });
    if (link) return link;
  }
  return null;
}
