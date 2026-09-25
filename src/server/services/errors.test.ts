import { describe, it, expect, afterAll } from "vitest";
import { differenceInCalendarDays } from "date-fns";
import { db } from "@/lib/db";
import { createError, deleteError, reviewError } from "./errors";
import { getFocusRecommendations } from "./planning";

const createdUserIds: string[] = [];
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

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

const base = { reason: "CONFUNDI" as const, lesson: "Sulfato ferroso: 1 h antes das refeições." };

describe("createError", () => {
  it("only the concept is required — question, photo, source and reason are optional", async () => {
    const user = await makeUser("err-minimal");
    const entry = await createError(user.id, { lesson: "IAM inferior: cuidado com nitrato (VD)." });
    expect(entry).toMatchObject({ question: null, imageId: null, source: null, reason: null });
  });

  it("links only the caller's own topics, and a topic implies its subject", async () => {
    const user = await makeUser("err-links");
    const other = await makeUser("err-links-other");
    const subject = await db.subject.create({ data: { userId: user.id, name: "Pediatria" } });
    const topic = await db.topic.create({ data: { userId: user.id, subjectId: subject.id, name: "Anemia" } });
    const otherSubject = await db.subject.create({ data: { userId: user.id, name: "Cardio" } });
    const foreign = await db.subject.create({ data: { userId: other.id, name: "X" } });
    const foreignTopic = await db.topic.create({ data: { userId: other.id, subjectId: foreign.id, name: "Y" } });

    const entry = await createError(user.id, { ...base, question: "Q", topicId: topic.id });
    expect(entry.subjectId).toBe(subject.id);

    await expect(createError(user.id, { ...base, question: "Q", topicId: foreignTopic.id })).rejects.toThrow("Tópico não encontrado.");
    await expect(createError(user.id, { ...base, question: "Q", subjectId: foreign.id })).rejects.toThrow("Matéria não encontrada.");
    await expect(
      createError(user.id, { ...base, question: "Q", subjectId: otherSubject.id, topicId: topic.id }),
    ).rejects.toThrow("não é dessa matéria");
  });

  it("validates the photo like any other image, and deleting the entry deletes the photo", async () => {
    const user = await makeUser("err-photo");
    await expect(createError(user.id, base, new TextEncoder().encode("<svg/>"))).rejects.toThrow("Formato não suportado");

    const entry = await createError(user.id, base, PNG);
    expect(entry.imageId).not.toBeNull();
    await deleteError(user.id, entry.id);
    expect(await db.image.count({ where: { id: entry.imageId! } })).toBe(0);
  });
});

describe("reviewError", () => {
  it("moves out on a right answer, resets on a wrong one — only for the owner", async () => {
    const user = await makeUser("err-review");
    const attacker = await makeUser("err-review-attacker");
    const entry = await createError(user.id, { ...base, question: "Q" });
    const now = new Date();

    expect(differenceInCalendarDays(entry.nextReviewAt, now)).toBe(1);
    const right = await reviewError(user.id, entry.id, true, now);
    expect(differenceInCalendarDays(right.nextReviewAt, now)).toBe(7);
    const wrong = await reviewError(user.id, entry.id, false, now);
    expect(wrong.stage).toBe(0);

    await expect(reviewError(attacker.id, entry.id, true, now)).rejects.toThrow("Erro não encontrado.");
  });
});

describe("planning signal", () => {
  it("a topic with recent errors ranks above an otherwise identical one, and says why", async () => {
    const user = await makeUser("err-planning");
    const subject = await db.subject.create({ data: { userId: user.id, name: "Clínica", priority: 3 } });
    const quiet = await db.topic.create({ data: { userId: user.id, subjectId: subject.id, name: "A", status: "REVISANDO" } });
    const shaky = await db.topic.create({ data: { userId: user.id, subjectId: subject.id, name: "B", status: "REVISANDO" } });
    await createError(user.id, { ...base, question: "Q1", topicId: shaky.id });
    await createError(user.id, { ...base, question: "Q2", topicId: shaky.id });

    const [first, second] = await getFocusRecommendations(user.id);
    expect(first.topicId).toBe(shaky.id);
    expect(first.reasons.map((r) => r.label)).toContain("Errou 2 questões recentemente");
    expect(second.topicId).toBe(quiet.id);
  });
});
