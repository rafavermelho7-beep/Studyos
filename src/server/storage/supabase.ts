import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ALLOWED_LESSON_FILE_TYPES, MAX_LESSON_FILE_BYTES, type FileStorage } from "./types";

// Built on the official client (not hand-rolled fetches): the new
// `sb_secret_...` keys must go in the `apikey` header and never as a Bearer
// token, which supabase-js handles for us. Server-side only — the secret key
// bypasses Storage RLS, so every call here is made after our own userId check.

const BUCKET = "lesson-files";
const SIGNED_READ_SECONDS = 120;

let bucketReady: Promise<void> | null = null;

export function createSupabaseStorage(url: string, secretKey: string): FileStorage {
  const storage = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage;

  // Private bucket, created on first use so there's nothing to click in
  // the Supabase dashboard. Its own limits back up the app's checks.
  function ensureBucket() {
    bucketReady ??= (async () => {
      const existing = await storage.getBucket(BUCKET);
      if (!existing.error) return;
      const created = await storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: MAX_LESSON_FILE_BYTES,
        allowedMimeTypes: Object.keys(ALLOWED_LESSON_FILE_TYPES),
      });
      // Lost a race with another function instance creating it — fine.
      if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
    })().catch((error) => {
      bucketReady = null; // retry next time instead of caching the failure
      throw error;
    });
    return bucketReady;
  }

  const files = () => storage.from(BUCKET);

  return {
    async createUploadUrl(path) {
      await ensureBucket();
      const { data, error } = await files().createSignedUploadUrl(path);
      if (error) throw error;
      return data.signedUrl;
    },
    async createDownloadUrl(path, downloadName) {
      const { data, error } = await files().createSignedUrl(
        path,
        SIGNED_READ_SECONDS,
        downloadName ? { download: downloadName } : undefined,
      );
      if (error) throw error;
      return data.signedUrl;
    },
    async stat(path) {
      const { data, error } = await files().info(path);
      if (error || data?.size == null) return null;
      return { size: data.size, contentType: data.contentType ?? "application/octet-stream" };
    },
    async remove(paths) {
      if (paths.length === 0) return;
      const { error } = await files().remove(paths);
      if (error) throw error;
    },
  };
}
