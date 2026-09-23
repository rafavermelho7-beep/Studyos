import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { startReview, gradeReview, undoLastReview, removeFromReview } from "./reviews";

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

describe("undoLastReview", () => {
  // Memory state only — `due` deliberately differs after an undo: like
  // ts-fsrs's rollback, the card becomes due as of the undone review (it
  // was due then, so it goes straight back into the queue).
  const memory = (row: { state: string; stability: number; difficulty: number; reps: number; lapses: number; lastReview: Date | null }) => ({
    state: row.state,
    stability: row.stability,
    difficulty: row.difficulty,
    reps: row.reps,
    lapses: row.lapses,
    lastReview: row.lastReview?.getTime() ?? null,
  });

  it("restores the memory state the previous grade produced, lapse included", async () => {
    const user = await makeUser("undo");
    const topic = await makeTopic(user.id);
    await startReview(user.id, topic.id);
    await gradeReview(user.id, topic.id, 3); // Good → REVIEW
    const before = await db.reviewState.findUniqueOrThrow({ where: { topicId: topic.id } });

    await gradeReview(user.id, topic.id, 1); // Again from REVIEW → a lapse
    const mistaken = await db.reviewState.findUniqueOrThrow({ where: { topicId: topic.id } });
    expect(mistaken.lapses).toBe(before.lapses + 1);

    expect(await undoLastReview(user.id, topic.id)).toBe(true);
    const after = await db.reviewState.findUniqueOrThrow({ where: { topicId: topic.id } });
    expect(memory(after)).toEqual(memory(before));
    expect(after.due.getTime()).toBeLessThanOrEqual(Date.now());
    expect(await db.reviewLog.count({ where: { topicId: topic.id } })).toBe(1);
  });

  it("puts a topic graded only once back to a fresh, due card", async () => {
    const user = await makeUser("undo-first");
    const topic = await makeTopic(user.id);
    await startReview(user.id, topic.id);
    await gradeReview(user.id, topic.id, 4);

    await undoLastReview(user.id, topic.id);
    const after = await db.reviewState.findUniqueOrThrow({ where: { topicId: topic.id } });
    expect(after.state).toBe("NEW");
    expect(after.reps).toBe(0);
    expect(after.lastReview).toBeNull();
    expect(after.due.getTime()).toBeLessThanOrEqual(Date.now());
    expect(await undoLastReview(user.id, topic.id)).toBe(false);
  });

  it("cannot touch another user's review state or history", async () => {
    const owner = await makeUser("owner");
    const attacker = await makeUser("attacker");
    const topic = await makeTopic(owner.id);
    await startReview(owner.id, topic.id);
    await gradeReview(owner.id, topic.id, 3);
    const before = await db.reviewState.findUniqueOrThrow({ where: { topicId: topic.id } });

    await expect(undoLastReview(attacker.id, topic.id)).rejects.toThrow("Tópico não encontrado.");
    await removeFromReview(attacker.id, topic.id);

    const after = await db.reviewState.findUniqueOrThrow({ where: { topicId: topic.id } });
    expect(memory(after)).toEqual(memory(before));
    expect(after.due.getTime()).toBe(before.due.getTime());
    expect(await db.reviewLog.count({ where: { topicId: topic.id } })).toBe(1);
  });
});
