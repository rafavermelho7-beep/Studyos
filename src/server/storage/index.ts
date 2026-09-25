import "server-only";
import { createLocalStorage } from "./local";
import { createSupabaseStorage } from "./supabase";
import type { FileStorage } from "./types";

export * from "./types";

/**
 * Supabase Storage whenever its credentials are present (always on Vercel);
 * the local disk stand-in only outside production. A production deploy
 * missing the credentials fails loudly instead of silently writing to an
 * ephemeral serverless filesystem.
 */
export function getFileStorage(requestOrigin: string): FileStorage {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (url && key && process.env.STORAGE_DRIVER !== "local") return createSupabaseStorage(url, key);
  if (isLocalStorageEnabled()) return createLocalStorage(requestOrigin);
  throw new Error("Armazenamento de arquivos não configurado (SUPABASE_URL / SUPABASE_SECRET_KEY).");
}

export function isLocalStorageEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.STORAGE_DRIVER === "local";
}
