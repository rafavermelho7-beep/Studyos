import type { Metadata } from "next";
import { subDays, parseISO, startOfDay } from "date-fns";
import { BarChart3 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getStudyStatsForPeriod, getCurrentStreak } from "@/server/services/stats";
import { Card, CardContent } from "@/components/ui/card";
import { PeriodFilter } from "./period-filter";
import { DailyBarChart } from "./daily-bar-chart";
import { SubjectBarChart } from "./subject-bar-chart";

export const metadata: Metadata = { title: "Estatísticas · StudyOS" };

function formatHours(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { period, from: fromParam, to: toParam } = await searchParams;
  const user = await requireUser();

  let from: Date;
  let to: Date;
  let activePeriod: string;

  if (fromParam && toParam) {
    from = parseISO(fromParam);
    to = parseISO(toParam);
    activePeriod = "custom";
  } else {
    const days = ["7", "30", "90", "180", "365"].includes(period ?? "") ? Number(period) : 30;
    to = new Date();
    from = subDays(startOfDay(to), days - 1);
    activePeriod = String(days);
  }

  const [stats, streak] = await Promise.all([
    getStudyStatsForPeriod(user.id, from, to),
    getCurrentStreak(user.id),
  ]);

  const hasAnyData = stats.totalSeconds > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Estatísticas</h1>
        <PeriodFilter active={activePeriod} />
      </div>

      {!hasAnyData ? (
        <div className="animate-fade-in-up flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border py-16 text-center">
          <BarChart3 className="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            Sem sessões de estudo registradas neste período.
          </p>
        </div>
      ) : (
        <>
          <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="hover-lift">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Horas estudadas</p>
                <p className="mt-0.5 text-lg font-semibold text-foreground">
                  {formatHours(stats.totalSeconds)}
                </p>
              </CardContent>
            </Card>
            <Card className="hover-lift">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Sessões</p>
                <p className="mt-0.5 text-lg font-semibold text-foreground">{stats.sessionCount}</p>
              </CardContent>
            </Card>
            <Card className="hover-lift">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Dias estudados</p>
                <p className="mt-0.5 text-lg font-semibold text-foreground">
                  {stats.daysStudied}/{stats.totalDaysInPeriod}
                </p>
              </CardContent>
            </Card>
            <Card className="hover-lift">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Sequência atual</p>
                <p className="mt-0.5 text-lg font-semibold text-foreground">
                  {streak} dia{streak === 1 ? "" : "s"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in-up mt-6 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
            <h2 className="mb-1 text-sm font-semibold text-foreground">Horas por dia</h2>
            <p className="mb-2 text-xs text-muted-foreground">Consistência: {stats.consistencyPercent}%</p>
            <DailyBarChart data={stats.daily} />
          </div>

          {stats.bySubject.length > 0 && (
            <div className="animate-fade-in-up mt-6 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Horas por matéria</h2>
              <SubjectBarChart data={stats.bySubject.map((s) => ({ name: s.name, color: s.color, seconds: s.seconds }))} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
