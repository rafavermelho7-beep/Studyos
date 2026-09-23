"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { logStudyEvent, deleteStudyEvent, updateStudyEventDuration } from "@/server/services/study-events";

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

function revalidateStudyTime() {
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  revalidatePath("/stats");
  revalidatePath("/schedule");
}

export async function deleteStudyEventAction(eventId: string) {
  const user = await requireUser();
  await deleteStudyEvent(user.id, eventId);
  revalidateStudyTime();
}

export async function updateStudyEventDurationAction(eventId: string, minutes: number) {
  const user = await requireUser();
  const parsed = z.number().int().min(1).max(24 * 60).parse(minutes);
  await updateStudyEventDuration(user.id, eventId, parsed * 60);
  revalidateStudyTime();
}
