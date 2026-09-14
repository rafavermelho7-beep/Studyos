import type { ContentStatus } from "@prisma/client";

export type ExamTopicStatus = { topic: { status: ContentStatus } };

export function computeExamPrep(examTopics: ExamTopicStatus[]) {
  const total = examTopics.length;
  const dominated = examTopics.filter((et) => et.topic.status === "DOMINADO").length;
  const inProgress = examTopics.filter(
    (et) => et.topic.status === "APRENDENDO" || et.topic.status === "REVISANDO",
  ).length;
  const notStarted = examTopics.filter((et) => et.topic.status === "NOVO").length;

  return {
    total,
    dominated,
    inProgress,
    notStarted,
    percent: total > 0 ? Math.round((dominated / total) * 100) : null,
  };
}
