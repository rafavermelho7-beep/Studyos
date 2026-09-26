import Link from "next/link";
import { differenceInCalendarDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, Moon, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectMark } from "@/components/ui/subject-mark";
import type { getAutoPlan } from "@/server/services/auto-schedule";
import { cn } from "@/lib/utils";
import { WeeklyHoursForm } from "./weekly-hours-form";

type Plan = Awaited<ReturnType<typeof getAutoPlan>>;

const DEFAULT_DAYS_SHOWN = 14;

function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function PlanView({ plan, today, showAll }: { plan: Plan; today: Date; showAll: boolean }) {
  const days = showAll ? plan.days : plan.days.slice(0, DEFAULT_DAYS_SHOWN);
  const examsWithoutTopics = plan.exams.filter((e) => e.topicCount === 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Quanto tempo você tem para estudar?</CardTitle>
          <p className="text-xs text-muted-foreground">
            Horas por dia da semana. O plano distribui os tópicos das suas próximas provas nesse tempo — os mais fracos
            voltam mais vezes, a prova mais próxima pesa mais e a véspera fica reservada. Ele se refaz sozinho quando
            você estuda, muda o status de um tópico ou cadastra uma prova.
          </p>
        </CardHeader>
        <CardContent>
          <WeeklyHoursForm initialMinutes={plan.weekly} />
        </CardContent>
      </Card>

      {plan.exams.length === 0 ? (
        <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border py-12 text-center">
          <CalendarClock className="mb-2 h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">Nenhuma prova nos próximos 60 dias.</p>
          <Link href="/exams" className="mt-2 text-sm font-medium text-accent hover:underline">
            Cadastrar uma prova
          </Link>
        </div>
      ) : !plan.hasTime ? (
        <p className="rounded-[var(--radius-lg)] border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Preencha as horas acima para gerar o plano.
        </p>
      ) : (
        <>
          {examsWithoutTopics.length > 0 && (
            <p className="rounded-[var(--radius-md)] border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
              {examsWithoutTopics.map((e) => e.name).join(", ")}{" "}
              {examsWithoutTopics.length === 1 ? "não tem" : "não têm"} tópicos vinculados — só a véspera entra no plano.{" "}
              <Link href={`/exams/${examsWithoutTopics[0].id}`} className="font-medium text-accent hover:underline">
                Vincular tópicos
              </Link>
            </p>
          )}

          <ol className="space-y-3" aria-label="Plano de estudos">
            {days.map((day) => {
              const isToday = isSameDay(day.date, today);
              const total = day.blocks.reduce((sum, b) => sum + b.minutes, 0);
              return (
                <li
                  key={day.date.toISOString()}
                  className={cn(
                    "rounded-[var(--radius-lg)] border bg-surface p-3",
                    isToday ? "border-accent" : "border-border",
                  )}
                  data-testid={isToday ? "plan-today" : undefined}
                >
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-semibold">
                      {isToday ? "Hoje" : capitalizeFirst(format(day.date, "EEEE, d 'de' MMM", { locale: ptBR }))}
                    </h2>
                    {total > 0 && <span className="text-xs tabular-nums text-muted-foreground">{formatMinutes(total)}</span>}
                  </div>
                  {day.blocks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Livre</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {day.blocks.map((block, i) => {
                        const daysLeft = differenceInCalendarDays(block.exam.date, day.date);
                        if (block.kind === "vespera") {
                          return (
                            <li key={i} className="flex items-center gap-2 rounded-[var(--radius-md)] bg-accent-soft px-2.5 py-2">
                              <Moon className="h-4 w-4 shrink-0 text-accent" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">Véspera · {block.exam.name}</p>
                                <p className="text-xs text-muted-foreground">{formatMinutes(block.minutes)} · prova amanhã</p>
                              </div>
                              <Link
                                href={`/exams/${block.exam.id}/vespera`}
                                className="shrink-0 text-xs font-semibold text-accent hover:underline"
                              >
                                Modo véspera
                              </Link>
                            </li>
                          );
                        }
                        const studied = isToday ? (plan.studiedTodayByTopic[block.topic.id] ?? 0) : 0;
                        const done = studied >= block.minutes;
                        return (
                          <li key={i} className="flex items-center gap-2 rounded-[var(--radius-md)] bg-surface-2 px-2.5 py-2">
                            <SubjectMark color={block.exam.subject.color} emoji={block.exam.subject.emoji} />
                            <div className="min-w-0 flex-1">
                              <p className={cn("truncate text-sm font-medium", done && "text-muted-foreground line-through")}>
                                {block.topic.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {formatMinutes(block.minutes)} · {block.exam.name} em {daysLeft} dias
                                {isToday && studied > 0 && !done && ` · ${formatMinutes(studied)} feitos`}
                              </p>
                            </div>
                            {isToday &&
                              (done ? (
                                <span className="shrink-0 text-xs font-semibold text-success">✓ Feito</span>
                              ) : (
                                <Link
                                  href={`/sessions?subjectId=${block.exam.subject.id}&topicId=${block.topic.id}`}
                                  className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:underline"
                                >
                                  <Play className="h-3 w-3" />
                                  Começar
                                </Link>
                              ))}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
          {!showAll && plan.days.length > DEFAULT_DAYS_SHOWN && (
            <Link
              href={`/schedule?view=plan&all=1`}
              className="block text-center text-sm font-medium text-accent hover:underline"
            >
              Ver o plano inteiro ({plan.days.length} dias)
            </Link>
          )}
        </>
      )}
    </div>
  );
}
