import Link from "next/link";
import { format, isSameMonth, isSameDay } from "date-fns";
import type { ScheduleItem } from "@/server/services/schedule";
import { cn } from "@/lib/utils";

const weekdayLabels = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function MonthView({
  days,
  monthDate,
  itemsByDay,
}: {
  days: Date[];
  monthDate: Date;
  itemsByDay: Map<string, ScheduleItem[]>;
}) {
  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border">
      {weekdayLabels.map((w) => (
        <div key={w} className="bg-surface-2 py-1.5 text-center text-[11px] font-medium uppercase text-muted-foreground">
          {w}
        </div>
      ))}
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const items = itemsByDay.get(key) ?? [];
        const inMonth = isSameMonth(day, monthDate);
        const isToday = isSameDay(day, today);

        return (
          <Link
            key={key}
            href={`/schedule?view=day&date=${key}`}
            className={cn(
              "min-h-[84px] bg-surface p-1.5 transition-colors hover:bg-surface-2",
              !inMonth && "bg-surface-2/50",
            )}
          >
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                isToday ? "bg-accent text-accent-foreground font-semibold" : "text-foreground",
                !inMonth && "text-muted-foreground",
              )}
            >
              {format(day, "d")}
            </span>
            <div className="mt-1 space-y-0.5">
              {items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-1 truncate text-[11px]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span
                    className={cn(
                      "truncate text-foreground",
                      item.kind === "task" && item.done && "text-muted-foreground line-through",
                    )}
                  >
                    {item.title}
                  </span>
                </div>
              ))}
              {items.length > 3 && (
                <p className="text-[11px] text-muted-foreground">+{items.length - 3}</p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
