import "server-only";

/** The single file field every photo upload form sends, as raw bytes. Type/size are validated by services/images. */
export async function readUploadedImage(formData: FormData): Promise<{ bytes: Uint8Array } | { error: string }> {
  const file = formData.get("image");
  if (!(file instanceof Blob) || file.size === 0) return { error: "Nenhuma imagem enviada." };
  return { bytes: new Uint8Array(await file.arrayBuffer()) };
}
