import Link from "next/link";
import { format } from "date-fns";
import { CheckCircle2, Circle, BookOpen as ExamIcon, Timer } from "lucide-react";
import type { ScheduleItem } from "@/server/services/schedule";
import { cn } from "@/lib/utils";

const kindIcon = { task: Circle, exam: ExamIcon, session: Timer } as const;

export function ScheduleItemRow({ item, showTime = true }: { item: ScheduleItem; showTime?: boolean }) {
  const Icon = item.done ? CheckCircle2 : kindIcon[item.kind];
  return (
    <Link
      href={item.href}
      className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1.5 text-sm hover:border-border-strong"
    >
      <Icon
        className={cn("h-3.5 w-3.5 shrink-0", item.done ? "text-success" : "text-muted-foreground")}
        style={!item.done ? { color: item.color } : undefined}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-foreground",
          // Strikethrough reads as "crossed off a list" — right for a
          // completed task, wrong for a session log entry (it isn't a
          // pending item that got resolved, it's just a record of study
          // time that already happened).
          item.kind === "task" && item.done && "text-muted-foreground line-through",
        )}
      >
        {item.title}
      </span>
      {item.subtitle && <span className="shrink-0 text-xs text-muted-foreground">{item.subtitle}</span>}
      {showTime && <span className="shrink-0 text-xs text-muted-foreground">{format(item.date, "HH:mm")}</span>}
    </Link>
  );
}
