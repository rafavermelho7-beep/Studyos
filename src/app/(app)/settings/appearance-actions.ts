"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { appearanceSchema, dashboardLayoutSchema, monthlyGoalSchema } from "@/lib/preferences";
import { setDashboardLayout, setMonthlyGoal, updateAppearance } from "@/server/services/preferences";

export async function saveAppearanceAction(input: { themeMode: string; accentColor: string; homePage: string }) {
  const user = await requireUser();
  await updateAppearance(user.id, appearanceSchema.parse(input));
  // Theme/accent are applied by the (app) layout, so every page is stale.
  revalidatePath("/", "layout");
}

export async function saveMonthlyGoalAction(goalHours: number | null) {
  const user = await requireUser();
  const parsed = monthlyGoalSchema.safeParse(goalHours);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Meta inválida" };
  await setMonthlyGoal(user.id, parsed.data);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function saveDashboardLayoutAction(blocks: { id: string; visible: boolean }[]) {
  const user = await requireUser();
  const parsed = dashboardLayoutSchema.safeParse(blocks);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Layout inválido" };
  await setDashboardLayout(user.id, parsed.data);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { error: null };
}
