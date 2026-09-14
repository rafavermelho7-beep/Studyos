import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { startReview, gradeReview } from "./reviews";

const createdUserIds: string[] = [];

async function makeUser(label: string) {
  const user = await db.user.create({
    data: { email: `${label}-${Date.now()}-${Math.random()}@test.local`, passwordHash: "unused" },
  });
  createdUserIds.push(user.id);
  return user;
}

async function makeTopic(userId: string) {
  const subject = await db.subject.create({ data: { userId, name: "Test Subject" } });
  return db.topic.create({ data: { userId, subjectId: subject.id, name: "Test Topic" } });
}

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

describe("gradeReview authorization", () => {
  it("rejects grading a topic that does not belong to the caller", async () => {
    const owner = await makeUser("owner");
    const attacker = await makeUser("attacker");
    const topic = await makeTopic(owner.id);

    await expect(gradeReview(attacker.id, topic.id, 3)).rejects.toThrow("Tópico não encontrado.");
  });

  it("does not corrupt the real owner's ReviewState when an attacker's grade attempt is rejected", async () => {
    const owner = await makeUser("owner");
    const attacker = await makeUser("attacker");
    const topic = await makeTopic(owner.id);

    // Owner has already reviewed this topic once for real.
    await startReview(owner.id, topic.id);
    await gradeReview(owner.id, topic.id, 4); // "Easy"
    const before = await db.reviewState.findUniqueOrThrow({ where: { topicId: topic.id } });

    await expect(gradeReview(attacker.id, topic.id, 1)).rejects.toThrow();

    const after = await db.reviewState.findUniqueOrThrow({ where: { topicId: topic.id } });
    expect(after.stability).toBe(before.stability);
    expect(after.due.getTime()).toBe(before.due.getTime());
    expect(after.reps).toBe(before.reps);

    // And no stray ReviewLog was attributed to the attacker for this topic.
    const attackerLogs = await db.reviewLog.findMany({ where: { userId: attacker.id, topicId: topic.id } });
    expect(attackerLogs).toHaveLength(0);
  });
});
