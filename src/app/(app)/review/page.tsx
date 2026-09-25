import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { listDueReviews, listReviewableTopics, estimateRetrievability } from "@/server/services/reviews";
import { ReviewQueue } from "./review-queue";
import { AddToReview } from "./add-to-review";

export const metadata: Metadata = { title: "Revisão · StudyOS" };

export default async function ReviewPage() {
  const user = await requireUser();
  const [dueReviews, reviewableTopics] = await Promise.all([
    listDueReviews(user.id),
    listReviewableTopics(user.id),
  ]);

  const items = dueReviews.map((row) => ({
    id: row.id,
    topicId: row.topicId,
    topicName: row.topic.name,
    subjectName: row.topic.subject.name,
    subjectColor: row.topic.subject.color,
    subjectEmoji: row.topic.subject.emoji,
    retrievabilityPercent: Math.round(estimateRetrievability(row) * 100),
    isNew: row.state === "NEW",
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Revisão</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {items.length} tópico{items.length === 1 ? "" : "s"} para revisar agora
      </p>

      <ReviewQueue items={items} />

      <AddToReview topics={reviewableTopics.map((t) => ({ id: t.id, name: t.name, subject: t.subject }))} />

      <p className="mt-8 text-xs text-muted-foreground">
        As porcentagens de retenção são estimativas do modelo FSRS, calculadas a partir do
        seu histórico de revisões — não são uma medida exata do que você lembra.
      </p>
    </div>
  );
}
