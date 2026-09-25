import "server-only";
import { db } from "@/lib/db";
import type { AccentColor, BackgroundStyle, DashboardBlock, HomePage, ThemeMode } from "@/lib/preferences";

// Per-user personalization. Every write is keyed on the caller's own
// userId (the User row IS the user), so there's no cross-user id to check.
// Values arrive already validated by the zod schemas in lib/preferences.

export async function updateAppearance(
  userId: string,
  input: { themeMode: ThemeMode; accentColor: AccentColor; homePage: HomePage },
) {
  await db.user.update({ where: { id: userId }, data: input });
}

export async function setMonthlyGoal(userId: string, goalHours: number | null) {
  await db.user.update({
    where: { id: userId },
    data: { monthlyGoalMinutes: goalHours === null ? null : goalHours * 60 },
  });
}

export async function setDashboardLayout(userId: string, blocks: { id: DashboardBlock; visible: boolean }[]) {
  await db.user.update({
    where: { id: userId },
    data: {
      dashboardOrder: blocks.map((b) => b.id),
      dashboardHidden: blocks.filter((b) => !b.visible).map((b) => b.id),
    },
  });
}

export async function setBackgroundStyle(userId: string, style: BackgroundStyle) {
  if (style === "photo") {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { backgroundImageId: true } });
    if (!user.backgroundImageId) throw new Error("Envie uma foto primeiro.");
  }
  await db.user.update({ where: { id: userId }, data: { backgroundStyle: style } });
}

/** Deletes the stored photo too (not just hides it) and goes back to a plain background. */
export async function removeBackgroundImage(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { backgroundImageId: true } });
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { backgroundStyle: "plain" } }),
    ...(user.backgroundImageId ? [db.image.deleteMany({ where: { id: user.backgroundImageId, userId } })] : []),
  ]);
}
