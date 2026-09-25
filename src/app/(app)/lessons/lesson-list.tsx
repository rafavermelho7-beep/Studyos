import Link from "next/link";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Paperclip } from "lucide-react";
import { SubjectMark } from "@/components/ui/subject-mark";

type LessonRow = {
  id: string;
  title: string;
  date: Date;
  _count: { attachments: number };
  subject?: { name: string; color: string; emoji: string | null };
};

function dayLabel(date: Date) {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "d 'de' MMM", { locale: ptBR });
}

/** Server-rendered, so dates format in the same timezone they were parsed in. */
export function LessonList({ lessons }: { lessons: LessonRow[] }) {
  return (
    <ul className="stagger space-y-1.5">
      {lessons.map((lesson) => (
        <li key={lesson.id}>
          <Link
            href={`/lessons/${lesson.id}`}
            className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5 transition-colors hover:border-border-strong"
          >
            <span className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">{dayLabel(lesson.date)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{lesson.title}</span>
              {lesson.subject && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <SubjectMark color={lesson.subject.color} emoji={lesson.subject.emoji} />
                  {lesson.subject.name}
                </span>
              )}
            </span>
            {lesson._count.attachments > 0 && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                {lesson._count.attachments}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
