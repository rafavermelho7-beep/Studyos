import "server-only";
import { addDays, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { buildPlan, MAX_PLAN_DAYS, readWeeklyMinutes } from "@/lib/auto-schedule";
import { weakness } from "@/lib/vespera";
import { estimateRetrievability } from "@/server/services/reviews";

export async function getWeeklyStudyMinutes(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { weeklyStudyMinutes: true } });
  return readWeeklyMinutes(user.weeklyStudyMinutes);
}

export async function setWeeklyStudyMinutes(userId: string, minutes: number[]) {
  await db.user.update({ where: { id: userId }, data: { weeklyStudyMinutes: readWeeklyMinutes(minutes) } });
}

/**
 * The automatic plan from today to the last upcoming exam, recomputed from
 * current data on every call (see lib/auto-schedule.ts). Blocks come back
 * with names/colors resolved, plus how much of each topic was already
 * studied today so today's blocks can show progress.
 */
export async function getAutoPlan(userId: string, now = new Date()) {
  const today = startOfDay(now);
  const [weekly, exams, studiedToday] = await Promise.all([
    getWeeklyStudyMinutes(userId),
    db.exam.findMany({
      where: { userId, date: { gte: addDays(today, 1), lte: addDays(today, MAX_PLAN_DAYS + 1) } },
      orderBy: { date: "asc" },
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
                _count: { select: { errorEntries: { where: { mastered: false } } } },
              },
            },
          },
        },
      },
    }),
    db.studyEvent.groupBy({
      by: ["topicId"],
      where: { userId, topicId: { not: null }, startedAt: { gte: today } },
      _sum: { durationSec: true },
    }),
  ]);

  const topicInfo = new Map<string, { name: string; subjectId: string }>();
  const planExams = exams.map((exam) => ({
    id: exam.id,
    date: exam.date,
    topics: exam.topics
      .map(({ topic }) => {
        topicInfo.set(topic.id, { name: topic.name, subjectId: exam.subjectId });
        const retention =
          topic.reviewState?.lastReview != null ? estimateRetrievability(topic.reviewState, now) : null;
        return {
          id: topic.id,
          name: topic.name,
          weight: weakness({ status: topic.status, retention, openErrors: topic._count.errorEntries }),
        };
      })
      // Weakest first, so ties in the block split favor the weak topic.
      .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, "pt-BR")),
  }));

  const examInfo = new Map(exams.map((e) => [e.id, { id: e.id, name: e.name, date: e.date, subject: e.subject }]));
  const studied = new Map(studiedToday.map((r) => [r.topicId!, Math.round((r._sum.durationSec ?? 0) / 60)]));

  const days = buildPlan(planExams, weekly, today).map((day) => ({
    date: day.date,
    blocks: day.blocks.map((block) => {
      const exam = examInfo.get(block.examId)!;
      return block.kind === "vespera"
        ? { ...block, exam, topic: null }
        : { ...block, exam, topic: { id: block.topicId, name: topicInfo.get(block.topicId)!.name } };
    }),
  }));

  return {
    weekly,
    hasTime: weekly.some((m) => m > 0),
    exams: exams.map((e) => ({ id: e.id, name: e.name, date: e.date, topicCount: e.topics.length, subject: e.subject })),
    days,
    studiedTodayByTopic: Object.fromEntries(studied),
  };
}
