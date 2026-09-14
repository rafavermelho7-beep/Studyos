"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { logStudyEvent } from "@/server/services/study-events";

const logSchema = z.object({
  subjectId: z.string().optional(),
  topicId: z.string().optional(),
  goal: z.string().trim().max(200).optional(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date(),
  durationSec: z.coerce.number().int().positive(),
  activityType: z.enum(["SESSION", "POMODORO"]),
});

export async function logStudySessionAction(input: {
  subjectId?: string;
  topicId?: string;
  goal?: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  activityType: "SESSION" | "POMODORO";
}) {
  const user = await requireUser();
  const parsed = logSchema.parse(input);

  const event = await logStudyEvent(user.id, parsed);
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  return { id: event.id, durationSec: event.durationSec };
}
