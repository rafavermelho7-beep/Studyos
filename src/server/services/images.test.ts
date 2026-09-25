import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  MAX_IMAGE_BYTES,
  getImageForUser,
  setBackgroundImage,
  setSubjectCover,
  removeSubjectCover,
  sniffImageType,
} from "./images";
import { deleteSubject } from "./subjects";
import { removeBackgroundImage } from "./preferences";

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

// Minimal byte signatures — enough for the sniffer; nothing decodes them.
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const WEBP = new Uint8Array([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBPVP8 ")]);
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

describe("sniffImageType", () => {
  it("recognizes by content, not by what the browser claims", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(WEBP)).toBe("image/webp");
    expect(sniffImageType(SVG)).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("<html>"))).toBeNull();
  });
});

describe("subject covers", () => {
  it("rejects non-images and oversized files", async () => {
    const user = await makeUser("cover-validate");
    const subject = await db.subject.create({ data: { userId: user.id, name: "Cardio" } });
    await expect(setSubjectCover(user.id, subject.id, SVG)).rejects.toThrow("Formato não suportado");
    const huge = new Uint8Array(MAX_IMAGE_BYTES + 1);
    huge.set(PNG);
    await expect(setSubjectCover(user.id, subject.id, huge)).rejects.toThrow("grande demais");
    expect(await db.image.count({ where: { userId: user.id } })).toBe(0);
  });

  it("can't be set on, or read from, another user's subject", async () => {
    const owner = await makeUser("cover-owner");
    const attacker = await makeUser("cover-attacker");
    const subject = await db.subject.create({ data: { userId: owner.id, name: "Cardio" } });

    await expect(setSubjectCover(attacker.id, subject.id, PNG)).rejects.toThrow("Matéria não encontrada.");
    const imageId = await setSubjectCover(owner.id, subject.id, PNG);
    expect(await getImageForUser(attacker.id, imageId)).toBeNull();
    expect((await getImageForUser(owner.id, imageId))?.contentType).toBe("image/png");
    await expect(removeSubjectCover(attacker.id, subject.id)).rejects.toThrow();
    expect(await db.image.count({ where: { id: imageId } })).toBe(1);
  });

  it("replacing, removing or deleting the subject leaves no orphaned photo", async () => {
    const user = await makeUser("cover-cleanup");
    const subject = await db.subject.create({ data: { userId: user.id, name: "Cardio" } });

    const first = await setSubjectCover(user.id, subject.id, PNG);
    const second = await setSubjectCover(user.id, subject.id, JPEG);
    expect(await db.image.findMany({ where: { userId: user.id }, select: { id: true } })).toEqual([{ id: second }]);
    expect(first).not.toBe(second);

    await removeSubjectCover(user.id, subject.id);
    expect(await db.image.count({ where: { userId: user.id } })).toBe(0);
    expect((await db.subject.findUniqueOrThrow({ where: { id: subject.id } })).coverImageId).toBeNull();

    await setSubjectCover(user.id, subject.id, WEBP);
    await deleteSubject(user.id, subject.id);
    expect(await db.image.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("background photo", () => {
  it("switches the style to photo, replaces cleanly, and removal deletes it", async () => {
    const user = await makeUser("background");
    await setBackgroundImage(user.id, PNG);
    await setBackgroundImage(user.id, JPEG);
    const saved = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.backgroundStyle).toBe("photo");
    expect(await db.image.count({ where: { userId: user.id } })).toBe(1);

    await removeBackgroundImage(user.id);
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.backgroundStyle).toBe("plain");
    expect(after.backgroundImageId).toBeNull();
    expect(await db.image.count({ where: { userId: user.id } })).toBe(0);
  });
});
