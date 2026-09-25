// A private file store for lesson materials. Two drivers with the same
// contract: Supabase Storage in production (supabase.ts) and a local disk
// stand-in for dev/e2e (local.ts) that mimics its protocol, so the same
// browser upload code runs against both.
//
// Upload protocol (both drivers, matching storage-js's uploadToSignedUrl):
// the browser PUTs a multipart FormData — field "cacheControl" plus the file
// under the empty field name "" — to the URL from createUploadUrl. No auth
// header: the token in the URL is the credential.
export interface FileStorage {
  /** Short-lived URL the browser can PUT exactly one object to, at `path`. */
  createUploadUrl(path: string): Promise<string>;
  /** Short-lived URL to read the object; `downloadName` forces a download instead of inline view. */
  createDownloadUrl(path: string, downloadName?: string): Promise<string>;
  /** What actually landed at `path` (null if nothing did) — never trust the client's claims. */
  stat(path: string): Promise<{ size: number; contentType: string } | null>;
  remove(paths: string[]): Promise<void>;
}

export const MAX_LESSON_FILE_BYTES = 50 * 1024 * 1024; // Supabase free plan's per-file cap
export const LESSON_FILES_QUOTA_BYTES = 1024 * 1024 * 1024; // Supabase free plan's 1 GB

export const ALLOWED_LESSON_FILE_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
  "application/vnd.ms-powerpoint": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/msword": "Word",
  "image/jpeg": "Imagem",
  "image/png": "Imagem",
  "image/webp": "Imagem",
};
