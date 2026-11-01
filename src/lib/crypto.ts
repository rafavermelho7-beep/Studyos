// Cifragem de segredos em repouso (tokens OAuth). AES-256-GCM com chave de 32 bytes
// em TOKEN_ENCRYPTION_KEY (base64). Formato: v1.<iv>.<tag>.<ciphertext> (base64url).
import crypto from "node:crypto";

export function encryptionKey(raw: string | undefined = process.env.TOKEN_ENCRYPTION_KEY): Buffer | null {
  if (!raw) return null;
  try {
    const b = Buffer.from(raw.trim(), "base64");
    return b.length === 32 ? b : null;
  } catch {
    return null;
  }
}

export function seal(plain: string, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function unseal(token: string, key: Buffer): string {
  const [v, iv, tag, ct] = token.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("formato de segredo inválido");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}
