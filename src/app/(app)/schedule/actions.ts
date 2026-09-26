"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { setWeeklyStudyMinutes } from "@/server/services/auto-schedule";

const weeklySchema = z.array(z.number().int().min(0).max(24 * 60, "Um dia tem no máximo 24 horas")).length(7);

export async function saveWeeklyStudyMinutesAction(minutes: number[]) {
  const user = await requireUser();
  const parsed = weeklySchema.safeParse(minutes);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Horários inválidos" };
  await setWeeklyStudyMinutes(user.id, parsed.data);
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  return { error: null };
}
