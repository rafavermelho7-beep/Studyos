import "server-only";
import { eachDayOfInterval, format, startOfDay, subDays, isSameDay } from "date-fns";
import { db } from "@/lib/db";

export type PeriodStats = {
  totalSeconds: number;
  sessionCount: number;
  daysStudied: number;
  totalDaysInPeriod: number;
  consistencyPercent: number;
  daily: { date: string; seconds: number }[];
  bySubject: { subjectId: string | null; name: string; color: string; seconds: number }[];
};

export async function getStudyStatsForPeriod(
  userId: string,
  from: Date,
  to: Date,
): Promise<PeriodStats> {
  const events = await db.studyEvent.findMany({
    where: { userId, startedAt: { gte: startOfDay(from), lte: to } },
    select: {
      durationSec: true,
      startedAt: true,
      subjectId: true,
      subject: { select: { name: true, color: true } },
    },
  });

  const totalSeconds = events.reduce((sum, e) => sum + e.durationSec, 0);
  const sessionCount = events.length;

  const days = eachDayOfInterval({ start: startOfDay(from), end: to });
  const daily = days.map((day) => ({
    date: format(day, "yyyy-MM-dd"),
    seconds: events
      .filter((e) => isSameDay(e.startedAt, day))
      .reduce((sum, e) => sum + e.durationSec, 0),
  }));
  const daysStudied = daily.filter((d) => d.seconds > 0).length;

  const bySubjectMap = new Map<string, { subjectId: string | null; name: string; color: string; seconds: number }>();
  for (const e of events) {
    const key = e.subjectId ?? "none";
    const existing = bySubjectMap.get(key);
    if (existing) {
      existing.seconds += e.durationSec;
    } else {
      bySubjectMap.set(key, {
        subjectId: e.subjectId,
        name: e.subject?.name ?? "Sem matéria",
        color: e.subject?.color ?? "#8a8a90",
        seconds: e.durationSec,
      });
    }
  }
  const bySubject = [...bySubjectMap.values()].sort((a, b) => b.seconds - a.seconds);

  return {
    totalSeconds,
    sessionCount,
    daysStudied,
    totalDaysInPeriod: days.length,
    consistencyPercent: days.length > 0 ? Math.round((daysStudied / days.length) * 100) : 0,
    daily,
    bySubject,
  };
}

/** Consecutive days up to today with at least one StudyEvent, looking back as far as needed. */
export async function getCurrentStreak(userId: string, maxLookbackDays = 365): Promise<number> {
  const since = subDays(startOfDay(new Date()), maxLookbackDays);
  const events = await db.studyEvent.findMany({
    where: { userId, startedAt: { gte: since } },
    select: { startedAt: true },
  });

  const studiedDays = new Set(events.map((e) => format(startOfDay(e.startedAt), "yyyy-MM-dd")));

  let streak = 0;
  let cursor = startOfDay(new Date());
  while (studiedDays.has(format(cursor, "yyyy-MM-dd"))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}
