import type { Metadata } from "next";
import Link from "next/link";
import {
  parseISO,
  format,
  isValid,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getScheduleItems } from "@/server/services/schedule";
import { getAutoPlan } from "@/server/services/auto-schedule";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { PlanView } from "./plan-view";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Cronograma · StudyOS" };

type View = "month" | "week" | "day" | "plan";

function urlFor(view: View, date: Date) {
  return `/schedule?view=${view}&date=${format(date, "yyyy-MM-dd")}`;
}

// CSS `capitalize` uppercases the first letter of EVERY word ("Setembro De
// 2026", "Segunda-Feira"), not just the phrase's first letter — wrong for
// Portuguese month/weekday names, which keep prepositions lowercase.
function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function anchorFor(dateParam: string | undefined) {
  return dateParam && isValid(parseISO(dateParam)) ? parseISO(dateParam) : new Date();
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; all?: string }>;
}) {
  const { view: viewParam, date: dateParam, all } = await searchParams;
  const user = await requireUser();

  const view: View = viewParam === "week" || viewParam === "day" || viewParam === "plan" ? viewParam : "month";
  const viewTabs = (
    <div className="flex gap-1 rounded-[var(--radius-sm)] bg-surface-2 p-1">
      {(["plan", "day", "week", "month"] as const).map((v) => (
        <Link
          key={v}
          href={v === "plan" ? "/schedule?view=plan" : urlFor(v, view === "plan" ? new Date() : anchorFor(dateParam))}
          className={cn(
            "rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium transition-[background-color,color,box-shadow] duration-150",
            view === v ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {v === "plan" ? "Plano" : v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
        </Link>
      ))}
    </div>
  );

  if (view === "plan") {
    const now = new Date();
    const plan = await getAutoPlan(user.id, now);
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Plano automático</h1>
          {viewTabs}
        </div>
        <PlanView plan={plan} today={now} showAll={all === "1"} />
      </div>
    );
  }
  const anchor = anchorFor(dateParam);

  let rangeStart: Date;
  let rangeEnd: Date;
  let days: Date[];
  let title: string;
  let prevUrl: string;
  let nextUrl: string;
  let todayUrl: string;

  if (view === "month") {
    const monthStart = startOfMonth(anchor);
    rangeStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    rangeEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
    days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    title = format(anchor, "MMMM 'de' yyyy", { locale: ptBR });
    prevUrl = urlFor("month", subMonths(anchor, 1));
    nextUrl = urlFor("month", addMonths(anchor, 1));
    todayUrl = urlFor("month", new Date());
  } else if (view === "week") {
    rangeStart = startOfWeek(anchor, { weekStartsOn: 0 });
    rangeEnd = endOfWeek(anchor, { weekStartsOn: 0 });
    days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    title = `${format(rangeStart, "d MMM", { locale: ptBR })} – ${format(rangeEnd, "d MMM", { locale: ptBR })}`;
    prevUrl = urlFor("week", subWeeks(anchor, 1));
    nextUrl = urlFor("week", addWeeks(anchor, 1));
    todayUrl = urlFor("week", new Date());
  } else {
    rangeStart = startOfDay(anchor);
    rangeEnd = endOfDay(anchor);
    days = [anchor];
    title = format(anchor, "EEEE, d 'de' MMMM", { locale: ptBR });
    prevUrl = urlFor("day", subDays(anchor, 1));
    nextUrl = urlFor("day", addDays(anchor, 1));
    todayUrl = urlFor("day", new Date());
  }

  const items = await getScheduleItems(user.id, startOfDay(rangeStart), endOfDay(rangeEnd));
  const itemsByDay = new Map<string, typeof items>();
  for (const item of items) {
    const key = format(item.date, "yyyy-MM-dd");
    const arr = itemsByDay.get(key) ?? [];
    arr.push(item);
    itemsByDay.set(key, arr);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{capitalizeFirst(title)}</h1>
        <div className="flex items-center gap-2">
          {viewTabs}
          <div className="flex items-center gap-1">
            <Link href={prevUrl} className="rounded-[var(--radius-sm)] p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-surface-2 hover:text-foreground" aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link href={todayUrl} className="rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface-2 hover:text-foreground">
              Hoje
            </Link>
            <Link href={nextUrl} className="rounded-[var(--radius-sm)] p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-surface-2 hover:text-foreground" aria-label="Próximo">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {view === "month" && <MonthView days={days} monthDate={anchor} itemsByDay={itemsByDay} />}
      {view === "week" && <WeekView days={days} itemsByDay={itemsByDay} />}
      {view === "day" && <DayView items={itemsByDay.get(format(anchor, "yyyy-MM-dd")) ?? []} />}
    </div>
  );
}
