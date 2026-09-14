import "server-only";
import { differenceInCalendarDays, subDays } from "date-fns";
import { db } from "@/lib/db";
import { estimateRetrievability } from "@/server/services/reviews";

// The priority engine (brief §31). Deliberately isolated here — never
// spread this scoring logic into components — so it stays a single place
// to read, test, and evolve. Every input is a real signal already in the
// database (exam dates, manual topic status, FSRS review state, subject
// priority); nothing here is invented or randomized.
//
// Score is additive and unbounded on purpose: it only has to produce a
// correct ORDER, not a calibrated 0-100 "readiness" number — turning it
// into a percentage would imply a precision the underlying signals don't
// have (see brief §46, the estimate-vs-fact principle).

export type FocusReason = { code: string; label: string };

export type FocusRecommendation = {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  score: number;
  urgency: "alta" | "media" | "baixa";
  reasons: FocusReason[];
};

export async function getFocusRecommendations(
  userId: string,
  limit = 5,
): Promise<FocusRecommendation[]> {
  const now = new Date();

  const topics = await db.topic.findMany({
    where: { userId },
    include: {
      subject: { select: { id: true, name: true, color: true, priority: true } },
      reviewState: true,
      examTopics: { include: { exam: { select: { date: true } } } },
    },
  });

  const scored = topics.map((topic) => {
    let score = 0;
    const reasons: FocusReason[] = [];

    const upcomingExamDates = topic.examTopics
      .map((et) => et.exam.date)
      .filter((d) => d >= now)
      .sort((a, b) => a.getTime() - b.getTime());

    if (upcomingExamDates.length > 0) {
      const days = differenceInCalendarDays(upcomingExamDates[0], now);
      if (days <= 3) {
        score += 40;
        reasons.push({ code: "exam", label: days <= 0 ? "Prova hoje" : `Prova em ${days} dia${days === 1 ? "" : "s"}` });
      } else if (days <= 7) {
        score += 25;
        reasons.push({ code: "exam", label: `Prova em ${days} dias` });
      } else if (days <= 14) {
        score += 15;
        reasons.push({ code: "exam", label: `Prova em ${days} dias` });
      } else if (days <= 30) {
        score += 5;
      }
    }

    if (topic.status === "NOVO") {
      score += 30;
      reasons.push({ code: "novo", label: "Ainda não estudado" });
    } else if (topic.status === "APRENDENDO") {
      score += 20;
      reasons.push({ code: "aprendendo", label: "Baixo domínio" });
    } else if (topic.status === "REVISANDO") {
      score += 10;
    }

    if (topic.reviewState) {
      if (topic.reviewState.due < now) {
        const daysLate = differenceInCalendarDays(now, topic.reviewState.due);
        score += Math.min(30, 15 + daysLate * 2);
        reasons.push({ code: "overdue", label: "Revisão atrasada" });
      } else if (topic.reviewState.lastReview) {
        const retention = estimateRetrievability(topic.reviewState, now);
        if (retention < 0.7) {
          score += 15;
          reasons.push({ code: "low-retention", label: "Retenção baixa" });
        }
      }
    }

    if (topic.subject.priority === 1) score += 10;
    else if (topic.subject.priority === 2) score += 5;

    return { topic, score, reasons };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ topic, score, reasons }) => ({
      topicId: topic.id,
      topicName: topic.name,
      subjectId: topic.subjectId,
      subjectName: topic.subject.name,
      subjectColor: topic.subject.color,
      score,
      urgency: score >= 50 ? "alta" : score >= 25 ? "media" : ("baixa" as const),
      reasons,
    }));
}

export type NeglectedSubject = { id: string; name: string; color: string; daysSinceLastStudy: number | null };

/** Subjects with no StudyEvent in the last `days` days — answers "what am I neglecting?". */
export async function getNeglectedSubjects(userId: string, days = 7): Promise<NeglectedSubject[]> {
  const since = subDays(new Date(), days);

  const subjects = await db.subject.findMany({
    where: { userId, topics: { some: {} } },
    select: {
      id: true,
      name: true,
      color: true,
      studyEvents: { orderBy: { startedAt: "desc" }, take: 1, select: { startedAt: true } },
    },
  });

  return subjects
    .filter((s) => s.studyEvents.length === 0 || s.studyEvents[0].startedAt < since)
    .map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      daysSinceLastStudy: s.studyEvents[0]
        ? differenceInCalendarDays(new Date(), s.studyEvents[0].startedAt)
        : null,
    }))
    .sort((a, b) => (b.daysSinceLastStudy ?? 9999) - (a.daysSinceLastStudy ?? 9999));
}
