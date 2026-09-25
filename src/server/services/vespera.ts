import "server-only";
import { db } from "@/lib/db";
import { estimateRetrievability } from "@/server/services/reviews";
import { weakness } from "@/lib/vespera";

/**
 * Everything the "modo véspera" page needs for one exam, weakest topic
 * first: signals for the ordering, plus what to reread for each topic —
 * its concepts from the Caderno de Erros (not-yet-fixed first) and the
 * files/links from the classes that covered it.
 */
export async function getVespera(userId: string, examId: string, now = new Date()) {
  const exam = await db.exam.findFirst({
    where: { id: examId, userId },
    include: {
      subject: { select: { id: true, name: true, color: true, emoji: true } },
      topics: {
        include: {
          topic: {
            select: {
              id: true,
              name: true,
              status: true,
              reviewState: true,
              errorEntries: {
                where: { userId },
                orderBy: [{ mastered: "asc" }, { createdAt: "desc" }],
                select: { id: true, lesson: true, mastered: true, source: true },
              },
              lessonTopics: {
                where: { lesson: { userId } },
                select: {
                  lesson: {
                    select: {
                      id: true,
                      title: true,
                      attachments: {
                        orderBy: { createdAt: "asc" },
                        select: { id: true, kind: true, name: true, url: true, contentType: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!exam) return null;

  const topics = exam.topics
    .map(({ topic }) => {
      const retention =
        topic.reviewState?.lastReview != null ? estimateRetrievability(topic.reviewState, now) : null;
      const openErrors = topic.errorEntries.filter((e) => !e.mastered).length;
      return {
        id: topic.id,
        name: topic.name,
        status: topic.status,
        retention,
        openErrors,
        weight: weakness({ status: topic.status, retention, openErrors }),
        concepts: topic.errorEntries,
        lessons: topic.lessonTopics.map((lt) => lt.lesson),
      };
    })
    .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, "pt-BR"));

  return { exam: { id: exam.id, name: exam.name, date: exam.date, subject: exam.subject }, topics };
}
