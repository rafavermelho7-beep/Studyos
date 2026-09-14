"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { startReview, gradeReview } from "@/server/services/reviews";
import type { Grade } from "ts-fsrs";

export async function startReviewAction(topicId: string) {
  const user = await requireUser();
  await startReview(user.id, topicId);
  revalidatePath("/review");
}

const gradeSchema = z.number().int().min(1).max(4);

export async function gradeReviewAction(topicId: string, rating: number) {
  const user = await requireUser();
  const parsed = gradeSchema.parse(rating) as Grade;
  const result = await gradeReview(user.id, topicId, parsed);
  revalidatePath("/review");
  revalidatePath("/dashboard");
  return result;
}
