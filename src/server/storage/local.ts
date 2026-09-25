import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, stat as fsStat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FileStorage } from "./types";

// Dev/e2e stand-in for Supabase Storage — never used in production (see
// getFileStorage). Same protocol: signed, expiring URLs; upload is a PUT of
// multipart FormData, served by src/app/api/dev-storage/[...path]/route.ts.

const ROOT = path.join(process.cwd(), ".local-storage");
// Must be stable across module instances: Next bundles the server action
// that signs a URL and the route handler that verifies it separately, so a
// per-module random secret never matches (the first e2e run caught this).
// Dev/e2e only, so deriving it from local config is enough.
const SECRET =
  process.env.LOCAL_STORAGE_SECRET ??
  createHash("sha256").update(`studyos-local-storage:${process.env.DATABASE_URL ?? ""}`).digest("hex");
const TTL_MS = 2 * 60 * 60 * 1000;

function sign(op: "put" | "get", objectPath: string, expires: number) {
  return createHmac("sha256", SECRET).update(`${op}\n${objectPath}\n${expires}`).digest("hex");
}

export function verifyLocalToken(op: "put" | "get", objectPath: string, expires: number, token: string) {
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  const expected = Buffer.from(sign(op, objectPath, expires));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Resolves inside ROOT only — a path like "../../etc" is refused. */
export function localFilePath(objectPath: string) {
  const full = path.resolve(ROOT, objectPath);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid path.");
  return full;
}

export async function writeLocalObject(objectPath: string, bytes: Uint8Array, contentType: string) {
  const full = localFilePath(objectPath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
  await writeFile(`${full}.meta.json`, JSON.stringify({ contentType }));
}

export async function readLocalObject(objectPath: string) {
  const full = localFilePath(objectPath);
  const [bytes, meta] = await Promise.all([readFile(full), readFile(`${full}.meta.json`, "utf8")]);
  return { bytes, contentType: (JSON.parse(meta) as { contentType: string }).contentType };
}

export function createLocalStorage(baseUrl: string): FileStorage {
  const url = (op: "put" | "get", objectPath: string, extra: Record<string, string> = {}) => {
    const expires = Date.now() + TTL_MS;
    const params = new URLSearchParams({ expires: String(expires), token: sign(op, objectPath, expires), ...extra });
    return `${baseUrl}/api/dev-storage/${objectPath.split("/").map(encodeURIComponent).join("/")}?${params}`;
  };

  return {
    async createUploadUrl(objectPath) {
      return url("put", objectPath);
    },
    async createDownloadUrl(objectPath, downloadName) {
      return url("get", objectPath, downloadName ? { download: downloadName } : {});
    },
    async stat(objectPath) {
      try {
        const full = localFilePath(objectPath);
        const [info, meta] = await Promise.all([fsStat(full), readFile(`${full}.meta.json`, "utf8")]);
        return { size: info.size, contentType: (JSON.parse(meta) as { contentType: string }).contentType };
      } catch {
        return null;
      }
    },
    async remove(paths) {
      await Promise.all(
        paths.flatMap((p) => [rm(localFilePath(p), { force: true }), rm(`${localFilePath(p)}.meta.json`, { force: true })]),
      );
    },
  };
}
