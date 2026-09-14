"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { generateApiKey, hashApiKeySecret } from "@/lib/auth/api-key";

export async function regenerateApiKeyAction(): Promise<string> {
  const user = await requireUser();
  const { plaintext, apiKeyId, secret } = generateApiKey();
  const apiKeyHash = await hashApiKeySecret(secret);

  await db.user.update({
    where: { id: user.id },
    data: { apiKeyId, apiKeyHash },
  });

  revalidatePath("/settings");
  return plaintext;
}

export async function revokeApiKeyAction(): Promise<void> {
  const user = await requireUser();
  await db.user.update({
    where: { id: user.id },
    data: { apiKeyId: null, apiKeyHash: null },
  });
  revalidatePath("/settings");
}
