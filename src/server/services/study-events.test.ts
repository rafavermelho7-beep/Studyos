import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { logStudyEvent, deleteStudyEvent, updateStudyEventDuration } from "./study-events";

const createdUserIds: string[] = [];

async function makeUser(label: string) {
  const user = await db.user.create({
    data: { email: `${label}-${Date.now()}-${Math.random()}@test.local`, passwordHash: "unused" },
  });
  createdUserIds.push(user.id);
  return user;
}

function logHour(userId: string, source: "STUDYOS" | "ANKI" = "STUDYOS") {
  const startedAt = new Date(Date.now() - 60 * 60 * 1000);
  return logStudyEvent(userId, { source, startedAt, endedAt: new Date(), durationSec: 3600 });
}

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

describe("correcting study events", () => {
  it("updates duration and keeps endedAt consistent with it", async () => {
    const user = await makeUser("edit");
    const event = await logHour(user.id);

    await updateStudyEventDuration(user.id, event.id, 45 * 60);
    const after = await db.studyEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.durationSec).toBe(2700);
    expect(after.endedAt!.getTime() - after.startedAt.getTime()).toBe(2700 * 1000);
  });

  it("refuses to edit or delete another user's event", async () => {
    const owner = await makeUser("owner");
    const attacker = await makeUser("attacker");
    const event = await logHour(owner.id);

    await expect(deleteStudyEvent(attacker.id, event.id)).rejects.toThrow("Sessão não encontrada.");
    await expect(updateStudyEventDuration(attacker.id, event.id, 60)).rejects.toThrow("Sessão não encontrada.");
    const after = await db.studyEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.durationSec).toBe(3600);
  });

  it("leaves Anki-synced events alone (the next sync would overwrite the edit anyway)", async () => {
    const user = await makeUser("anki");
    const event = await logHour(user.id, "ANKI");

    await expect(deleteStudyEvent(user.id, event.id)).rejects.toThrow();
    await expect(updateStudyEventDuration(user.id, event.id, 60)).rejects.toThrow();
    expect(await db.studyEvent.count({ where: { id: event.id } })).toBe(1);
  });

  it("deletes the caller's own event", async () => {
    const user = await makeUser("delete");
    const event = await logHour(user.id);
    await deleteStudyEvent(user.id, event.id);
    expect(await db.studyEvent.count({ where: { id: event.id } })).toBe(0);
  });
});
