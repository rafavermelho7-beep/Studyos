"use server";

import { redirect } from "next/navigation";
import { homePath } from "@/lib/preferences";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { loginSchema, registerSchema } from "@/lib/auth/schemas";
import { isRateLimited, recordFailedAttempt, clearAttempts } from "@/lib/auth/rate-limit";

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      onboarding: { create: {} },
    },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;

  if (isRateLimited(email)) {
    return { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };
  }

  const user = await db.user.findUnique({ where: { email } });

  // Always run bcrypt.compare, even against a decoy hash when the user
  // doesn't exist, so a nonexistent email doesn't return measurably faster
  // than a wrong password — that timing gap is an email-enumeration oracle.
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !valid) {
    recordFailedAttempt(email);
    return { error: "E-mail ou senha incorretos." };
  }

  clearAttempts(email);
  await createSession(user.id);
  redirect(homePath(user.homePage));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
