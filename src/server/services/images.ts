import "server-only";
import { db } from "@/lib/db";

// Subject covers and the app background. See the Image model comment in
// schema.prisma for why these live in Postgres. Uploads are already
// resized/compressed in the browser (lib/image-compress.ts); this layer
// still enforces type and size itself — never trusts the client for either.

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type ImageType = "image/webp" | "image/jpeg" | "image/png";

/** Content type from the file's magic bytes; null for anything else (SVG, HTML, …). */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  return null;
}

function validate(bytes: Uint8Array) {
  if (bytes.length === 0) throw new Error("Arquivo vazio.");
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error("Imagem grande demais (máximo 2 MB).");
  const contentType = sniffImageType(bytes);
  if (!contentType) throw new Error("Formato não suportado. Use JPG, PNG ou WebP.");
  return contentType;
}

export async function setSubjectCover(userId: string, subjectId: string, bytes: Uint8Array) {
  const contentType = validate(bytes);
  const subject = await db.subject.findFirst({ where: { id: subjectId, userId }, select: { coverImageId: true } });
  if (!subject) throw new Error("Matéria não encontrada.");

  return db.$transaction(async (tx) => {
    const image = await tx.image.create({
      data: { userId, contentType, byteSize: bytes.length, data: Buffer.from(bytes) },
      select: { id: true },
    });
    await tx.subject.updateMany({ where: { id: subjectId, userId }, data: { coverImageId: image.id } });
    // The replaced cover isn't referenced anywhere else — don't leave it behind.
    if (subject.coverImageId) await tx.image.deleteMany({ where: { id: subject.coverImageId, userId } });
    return image.id;
  });
}

export async function removeSubjectCover(userId: string, subjectId: string) {
  const subject = await db.subject.findFirst({ where: { id: subjectId, userId }, select: { coverImageId: true } });
  if (!subject) throw new Error("Matéria não encontrada.");
  // onDelete: SetNull clears Subject.coverImageId.
  if (subject.coverImageId) await db.image.deleteMany({ where: { id: subject.coverImageId, userId } });
}

export async function setBackgroundImage(userId: string, bytes: Uint8Array) {
  const contentType = validate(bytes);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { backgroundImageId: true } });

  return db.$transaction(async (tx) => {
    const image = await tx.image.create({
      data: { userId, contentType, byteSize: bytes.length, data: Buffer.from(bytes) },
      select: { id: true },
    });
    await tx.user.update({ where: { id: userId }, data: { backgroundImageId: image.id, backgroundStyle: "photo" } });
    if (user.backgroundImageId) await tx.image.deleteMany({ where: { id: user.backgroundImageId, userId } });
    return image.id;
  });
}

/** For GET /api/images/[id] — null (→ 404) unless the image is the caller's own. */
export function getImageForUser(userId: string, imageId: string) {
  return db.image.findFirst({ where: { id: imageId, userId }, select: { contentType: true, data: true } });
}

/** Ownership check without loading the bytes (conditional requests → 304). */
export async function userOwnsImage(userId: string, imageId: string) {
  return (await db.image.count({ where: { id: imageId, userId } })) > 0;
}
