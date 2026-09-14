import "server-only";
import { db } from "@/lib/db";

export type MapStatus = "DOMINADO" | "ATENCAO" | "ATRASADO" | "NAO_ESTUDADO";

export type MapTopic = {
  id: string;
  name: string;
  mapStatus: MapStatus;
};

export type MapSubject = {
  id: string;
  name: string;
  color: string;
  topics: MapTopic[];
  counts: Record<MapStatus, number>;
};

function computeMapStatus(
  contentStatus: string,
  reviewDue: Date | null,
  now: Date,
): MapStatus {
  if (reviewDue && reviewDue < now) return "ATRASADO";
  if (contentStatus === "DOMINADO") return "DOMINADO";
  if (contentStatus === "NOVO" && !reviewDue) return "NAO_ESTUDADO";
  return "ATENCAO";
}

export async function getKnowledgeMap(userId: string): Promise<MapSubject[]> {
  const subjects = await db.subject.findMany({
    where: { userId },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
    include: {
      topics: {
        include: { reviewState: { select: { due: true } } },
        orderBy: { name: "asc" },
      },
    },
  });

  const now = new Date();

  return subjects.map((subject) => {
    const counts: Record<MapStatus, number> = {
      DOMINADO: 0,
      ATENCAO: 0,
      ATRASADO: 0,
      NAO_ESTUDADO: 0,
    };

    const topics: MapTopic[] = subject.topics.map((topic) => {
      const mapStatus = computeMapStatus(topic.status, topic.reviewState?.due ?? null, now);
      counts[mapStatus] += 1;
      return { id: topic.id, name: topic.name, mapStatus };
    });

    return { id: subject.id, name: subject.name, color: subject.color, topics, counts };
  });
}
