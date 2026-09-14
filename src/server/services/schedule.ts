import "server-only";
import { db } from "@/lib/db";

export type ScheduleItem = {
  id: string;
  kind: "task" | "exam" | "session";
  date: Date;
  title: string;
  subtitle: string | null;
  color: string;
  href: string;
  done: boolean;
};

export async function getScheduleItems(userId: string, from: Date, to: Date): Promise<ScheduleItem[]> {
  const [tasks, exams, sessions] = await Promise.all([
    db.task.findMany({
      where: { userId, dueDate: { gte: from, lte: to } },
      include: { subject: { select: { name: true, color: true } } },
    }),
    db.exam.findMany({
      where: { userId, date: { gte: from, lte: to } },
      include: { subject: { select: { name: true, color: true } } },
    }),
    db.studyEvent.findMany({
      where: { userId, startedAt: { gte: from, lte: to } },
      include: { subject: { select: { name: true, color: true } }, topic: { select: { name: true } } },
    }),
  ]);

  const items: ScheduleItem[] = [
    ...tasks.map((t) => ({
      id: t.id,
      kind: "task" as const,
      date: t.dueDate!,
      title: t.title,
      subtitle: t.subject?.name ?? null,
      color: t.subject?.color ?? "#6b6b6f",
      href: "/tasks",
      done: t.status === "DONE",
    })),
    ...exams.map((e) => ({
      id: e.id,
      kind: "exam" as const,
      date: e.date,
      title: e.name,
      subtitle: e.subject.name,
      color: e.subject.color,
      href: `/exams/${e.id}`,
      done: false,
    })),
    ...sessions.map((s) => ({
      id: s.id,
      kind: "session" as const,
      date: s.startedAt,
      title: s.subject?.name ? `${s.subject.name}${s.topic ? ` · ${s.topic.name}` : ""}` : "Estudo livre",
      subtitle: `${Math.round(s.durationSec / 60)} min`,
      color: s.subject?.color ?? "#6b6b6f",
      href: "/sessions",
      done: true,
    })),
  ];

  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}
