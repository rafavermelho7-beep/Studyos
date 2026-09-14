import "server-only";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { User } from "@prisma/client";

const KEY_PREFIX = "sk_live_";
const SALT_ROUNDS = 12;

/** Generates a new key and returns the plaintext (show once) + its parts to persist. */
export function generateApiKey() {
  const apiKeyId = randomBytes(8).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  const plaintext = `${KEY_PREFIX}${apiKeyId}_${secret}`;
  return { plaintext, apiKeyId, secret };
}

export function hashApiKeySecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, SALT_ROUNDS);
}

function parseApiKey(plaintext: string): { apiKeyId: string; secret: string } | null {
  if (!plaintext.startsWith(KEY_PREFIX)) return null;
  const rest = plaintext.slice(KEY_PREFIX.length);
  const separator = rest.indexOf("_");
  if (separator === -1) return null;
  return { apiKeyId: rest.slice(0, separator), secret: rest.slice(separator + 1) };
}

/** Authenticates a connector request by its Authorization: Bearer <key> value. */
export async function authenticateApiKey(plaintext: string): Promise<User | null> {
  const parsed = parseApiKey(plaintext);
  if (!parsed) return null;

  const user = await db.user.findUnique({ where: { apiKeyId: parsed.apiKeyId } });
  if (!user || !user.apiKeyHash) return null;

  const valid = await bcrypt.compare(parsed.secret, user.apiKeyHash);
  return valid ? user : null;
}
