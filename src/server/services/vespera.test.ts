import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { getVespera } from "./vespera";
import { createError } from "./errors";

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

describe("getVespera", () => {
  it("orders the exam's topics weakest-first and brings each topic's open concepts", async () => {
    const user = await makeUser("vespera");
    const subject = await db.subject.create({ data: { userId: user.id, name: "Pediatria" } });
    const mastered = await db.topic.create({ data: { userId: user.id, subjectId: subject.id, name: "Puericultura", status: "DOMINADO" } });
    const fresh = await db.topic.create({ data: { userId: user.id, subjectId: subject.id, name: "Anemias", status: "NOVO" } });
    const notInExam = await db.topic.create({ data: { userId: user.id, subjectId: subject.id, name: "Fora", status: "NOVO" } });
    const exam = await db.exam.create({
      data: {
        userId: user.id,
        subjectId: subject.id,
        name: "P2",
        date: new Date(Date.now() + 86_400_000),
        topics: { create: [{ topicId: mastered.id }, { topicId: fresh.id }] },
      },
    });
    await createError(user.id, { lesson: "Vacina BCG ao nascer.", topicId: mastered.id });

    const data = await getVespera(user.id, exam.id);
    expect(data!.topics.map((t) => t.name)).toEqual(["Anemias", "Puericultura"]);
    expect(data!.topics.map((t) => t.id)).not.toContain(notInExam.id);
    const puericultura = data!.topics[1];
    expect(puericultura.openErrors).toBe(1);
    expect(puericultura.concepts.map((c) => c.lesson)).toEqual(["Vacina BCG ao nascer."]);
  });

  it("is null for someone else's exam", async () => {
    const owner = await makeUser("vespera-owner");
    const other = await makeUser("vespera-other");
    const subject = await db.subject.create({ data: { userId: owner.id, name: "Cardio" } });
    const exam = await db.exam.create({ data: { userId: owner.id, subjectId: subject.id, name: "P1", date: new Date() } });
    expect(await getVespera(other.id, exam.id)).toBeNull();
  });
});
