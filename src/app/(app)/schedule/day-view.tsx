import { CalendarX } from "lucide-react";
import type { ScheduleItem } from "@/server/services/schedule";
import { ScheduleItemRow } from "./schedule-item-row";

export function DayView({ items }: { items: ScheduleItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border py-12 text-center">
        <CalendarX className="mb-2 h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">Nada agendado neste dia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <ScheduleItemRow key={item.id} item={item} />
      ))}
    </div>
  );
}
