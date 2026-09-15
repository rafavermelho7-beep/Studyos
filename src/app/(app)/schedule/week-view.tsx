import Link from "next/link";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ScheduleItem } from "@/server/services/schedule";
import { ScheduleItemRow } from "./schedule-item-row";
import { cn } from "@/lib/utils";

export function WeekView({ days, itemsByDay }: { days: Date[]; itemsByDay: Map<string, ScheduleItem[]> }) {
  const today = new Date();

  return (
    <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const items = itemsByDay.get(key) ?? [];
        const isToday = isSameDay(day, today);

        return (
          <div key={key} className="min-w-0">
            <Link
              href={`/schedule?view=day&date=${key}`}
              className={cn(
                "mb-1.5 flex items-baseline gap-1.5 text-xs font-medium",
                isToday ? "text-accent" : "text-muted-foreground",
              )}
            >
              <span className="capitalize">{format(day, "EEE", { locale: ptBR })}</span>
              <span>{format(day, "d/M")}</span>
            </Link>
            <div className="space-y-1">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground">—</p>
              ) : (
                items.map((item) => <ScheduleItemRow key={item.id} item={item} showTime={false} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
