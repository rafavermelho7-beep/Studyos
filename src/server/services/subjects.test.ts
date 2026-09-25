import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { applySuggestedEmojis, createSubject, setSubjectEmoji } from "./subjects";

const createdUserIds: string[] = [];

async function makeUser(label: string) {
  const user = await db.user.create({
    data: { email: `${label}-${Date.now()}-${Math.random()}@test.local`, passwordHash: "unused" },
  });
  createdUserIds.push(user.id);
  return user;
}

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

describe("subject emojis", () => {
  it("fills in suggestions only where missing and recognizable", async () => {
    const user = await makeUser("emoji-apply");
    // Subjects from before emojis existed.
    const mulher = await db.subject.create({ data: { userId: user.id, name: "Saúde da Mulher 1" } });
    const ingles = await db.subject.create({ data: { userId: user.id, name: "Inglês instrumental" } });
    const chosen = await db.subject.create({ data: { userId: user.id, name: "Cardiologia", emoji: "🧠" } });

    expect(await applySuggestedEmojis(user.id)).toBe(1);
    const byId = async (id: string) => (await db.subject.findUniqueOrThrow({ where: { id } })).emoji;
    expect(await byId(mulher.id)).toBe("🌸");
    expect(await byId(ingles.id)).toBeNull(); // no guess
    expect(await byId(chosen.id)).toBe("🧠"); // the user's own choice is never overwritten
  });

  it("new subjects start with their suggestion", async () => {
    const user = await makeUser("emoji-create");
    expect((await createSubject(user.id, { name: "Pediatria" })).emoji).toBe("👶");
  });

  it("only accepts emojis from the curated list, and only on your own subject", async () => {
    const owner = await makeUser("emoji-owner");
    const attacker = await makeUser("emoji-attacker");
    const subject = await createSubject(owner.id, { name: "Nefrologia" });

    await expect(setSubjectEmoji(owner.id, subject.id, "<script>")).rejects.toThrow("Emoji inválido.");
    await expect(setSubjectEmoji(attacker.id, subject.id, "🧠")).rejects.toThrow("Matéria não encontrada.");
    expect((await db.subject.findUniqueOrThrow({ where: { id: subject.id } })).emoji).toBe("🫘");
  });
});
