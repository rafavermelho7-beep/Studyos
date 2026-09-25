import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  confirmLessonUpload,
  createLesson,
  deleteLesson,
  lessonFilePathsForSubject,
  prepareLessonUpload,
  setLessonTopics,
} from "./lessons";

const createdUserIds: string[] = [];
const PDF = "application/pdf";

async function makeUser(label: string) {
  const user = await db.user.create({
    data: { email: `${label}-${Date.now()}-${Math.random()}@test.local`, passwordHash: "unused" },
  });
  createdUserIds.push(user.id);
  return user;
}

async function makeLesson(userId: string) {
  const subject = await db.subject.create({ data: { userId, name: "Ginecologia" } });
  const lesson = await createLesson(userId, { subjectId: subject.id, title: "Aula 1", date: new Date() });
  return { subject, lesson };
}

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

describe("lesson uploads", () => {
  it("refuses unknown types, oversized files and someone else's lesson", async () => {
    const owner = await makeUser("lesson-owner");
    const attacker = await makeUser("lesson-attacker");
    const { lesson } = await makeLesson(owner.id);

    await expect(prepareLessonUpload(owner.id, lesson.id, { name: "x.html", size: 10, type: "text/html" })).rejects.toThrow(
      "Tipo de arquivo não suportado",
    );
    await expect(
      prepareLessonUpload(owner.id, lesson.id, { name: "big.pdf", size: 51 * 1024 * 1024, type: PDF }),
    ).rejects.toThrow("50 MB");
    await expect(prepareLessonUpload(attacker.id, lesson.id, { name: "a.pdf", size: 10, type: PDF })).rejects.toThrow(
      "Aula não encontrada.",
    );

    const path = await prepareLessonUpload(owner.id, lesson.id, { name: "Aula 1 – Pré-natal.pdf", size: 10, type: PDF });
    expect(path.startsWith(`${owner.id}/${lesson.id}/`)).toBe(true);
    expect(path).not.toMatch(/[\s–é]/); // sanitized name
  });

  it("enforces the 1 GB quota across all lessons", async () => {
    const user = await makeUser("lesson-quota");
    const { lesson } = await makeLesson(user.id);
    await db.lessonAttachment.create({
      data: { userId: user.id, lessonId: lesson.id, kind: "FILE", name: "old.pdf", storagePath: `${user.id}/x`, byteSize: 1024 * 1024 * 1024 - 5 },
    });
    await expect(prepareLessonUpload(user.id, lesson.id, { name: "a.pdf", size: 10, type: PDF })).rejects.toThrow("1 GB");
  });

  it("only records what actually landed, at a path this user and lesson own", async () => {
    const user = await makeUser("lesson-confirm");
    const other = await makeUser("lesson-other");
    const { lesson } = await makeLesson(user.id);
    const good = `${user.id}/${lesson.id}/abc-aula.pdf`;
    const stored = { size: 1234, contentType: PDF };

    expect(await confirmLessonUpload(user.id, lesson.id, { storagePath: good, name: "aula.pdf" }, null)).toBeNull();
    expect(
      await confirmLessonUpload(user.id, lesson.id, { storagePath: good, name: "a" }, { size: 10, contentType: "text/html" }),
    ).toBeNull();
    // Claiming another user's object, or escaping the folder.
    expect(
      await confirmLessonUpload(user.id, lesson.id, { storagePath: `${other.id}/${lesson.id}/x.pdf`, name: "x" }, stored),
    ).toBeNull();
    expect(
      await confirmLessonUpload(user.id, lesson.id, { storagePath: `${user.id}/${lesson.id}/../../x.pdf`, name: "x" }, stored),
    ).toBeNull();

    const attachment = await confirmLessonUpload(user.id, lesson.id, { storagePath: good, name: "aula.pdf" }, stored);
    expect(attachment?.byteSize).toBe(1234); // the size Storage reports, not the client's claim
  });
});

describe("lesson topics and deletion", () => {
  it("links only this user's topics from the lesson's own subject", async () => {
    const user = await makeUser("lesson-topics");
    const other = await makeUser("lesson-topics-other");
    const { subject, lesson } = await makeLesson(user.id);
    const mine = await db.topic.create({ data: { userId: user.id, subjectId: subject.id, name: "Pré-natal" } });
    const otherSubject = await db.subject.create({ data: { userId: user.id, name: "Pediatria" } });
    const wrongSubject = await db.topic.create({ data: { userId: user.id, subjectId: otherSubject.id, name: "X" } });
    const othersSubject = await db.subject.create({ data: { userId: other.id, name: "Y" } });
    const notMine = await db.topic.create({ data: { userId: other.id, subjectId: othersSubject.id, name: "Z" } });

    await setLessonTopics(user.id, lesson.id, [mine.id, wrongSubject.id, notMine.id]);
    const linked = await db.lessonTopic.findMany({ where: { lessonId: lesson.id } });
    expect(linked.map((l) => l.topicId)).toEqual([mine.id]);
  });

  it("hands back the file paths to delete from Storage", async () => {
    const user = await makeUser("lesson-delete");
    const { subject, lesson } = await makeLesson(user.id);
    await db.lessonAttachment.createMany({
      data: [
        { userId: user.id, lessonId: lesson.id, kind: "FILE", name: "a.pdf", storagePath: `${user.id}/${lesson.id}/a.pdf`, byteSize: 1 },
        { userId: user.id, lessonId: lesson.id, kind: "LINK", name: "vídeo", url: "https://example.com" },
      ],
    });
    expect(await lessonFilePathsForSubject(user.id, subject.id)).toEqual([`${user.id}/${lesson.id}/a.pdf`]);
    const result = await deleteLesson(user.id, lesson.id);
    expect(result.storagePaths).toEqual([`${user.id}/${lesson.id}/a.pdf`]);
    expect(await db.lessonAttachment.count({ where: { lessonId: lesson.id } })).toBe(0);
  });
});
