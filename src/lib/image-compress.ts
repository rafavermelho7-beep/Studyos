// Browser-only: shrink a picked photo before upload. A phone photo is
// 3-8 MB and far larger than any place it's shown; resizing to the
// display size and re-encoding brings it to ~100-400 KB, which keeps
// uploads fast on mobile data and the database small (see the Image model).

const QUALITY = 0.82;

export async function compressImage(file: File, maxDimension: number): Promise<Blob> {
  // createImageBitmap applies EXIF orientation, so portrait phone photos
  // don't come out sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
  // Browsers that can't encode WebP silently hand back PNG (huge for
  // photos) — fall back to JPEG in that case.
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await toBlob("image/jpeg");
  if (!jpeg) throw new Error("Não foi possível processar a imagem.");
  return jpeg;
}
