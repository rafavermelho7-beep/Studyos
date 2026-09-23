import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { computeExamPrep, type ExamTopicStatus } from "@/lib/exam-prep";
import { cn } from "@/lib/utils";
import { UndoableDeleteButton } from "@/components/ui/delete-buttons";
import { HideIfPendingDelete } from "@/components/ui/undo-toast";
import { deleteExamAction } from "./actions";

type ExamCardProps = {
  exam: {
    id: string;
    name: string;
    date: Date;
    location: string | null;
    subject: { name: string; color: string };
    topics: ExamTopicStatus[];
  };
};

export function ExamCard({ exam }: ExamCardProps) {
  const daysRemaining = differenceInCalendarDays(new Date(exam.date), new Date());
  const prep = computeExamPrep(exam.topics);

  return (
    <HideIfPendingDelete id={exam.id}>
      <div className="relative rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-sm)] transition-[box-shadow,border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]">
        <Link href={`/exams/${exam.id}`} className="block rounded-[var(--radius-lg)] p-4 pr-11">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: exam.subject.color }} />
                {exam.subject.name}
              </div>
              <p className="mt-0.5 truncate font-medium text-foreground">{exam.name}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(exam.date), "d 'de' MMMM", { locale: ptBR })}
                {exam.location && ` · ${exam.location}`}
              </p>
            </div>
            <div
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                daysRemaining < 0
                  ? "bg-surface-2 text-muted-foreground"
                  : daysRemaining <= 3
                    ? "bg-danger-soft text-danger"
                    : daysRemaining <= 7
                      ? "bg-warning-soft text-warning"
                      : "bg-accent-soft text-accent",
              )}
            >
              {daysRemaining < 0
                ? "Concluída"
                : daysRemaining === 0
                  ? "Hoje"
                  : `${daysRemaining} dia${daysRemaining === 1 ? "" : "s"}`}
            </div>
          </div>

          {prep.total > 0 ? (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-success transition-[width] duration-500 ease-out"
                  style={{ width: `${prep.percent}%` }}
                />
              </div>
              <div className="mt-1.5 flex gap-3 text-xs text-muted-foreground">
                <span>🔴 {prep.notStarted} não estudados</span>
                <span>🟡 {prep.inProgress} em progresso</span>
                <span>🟢 {prep.dominated} dominados</span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Nenhum conteúdo associado ainda.</p>
          )}
        </Link>
        {/* Outside the <Link>: a button nested in an <a> is invalid HTML. */}
        <UndoableDeleteButton
          id={exam.id}
          label={`Excluir prova "${exam.name}"`}
          message="Prova excluída"
          onDelete={deleteExamAction.bind(null, exam.id)}
          className="absolute right-4 top-5"
        />
      </div>
    </HideIfPendingDelete>
  );
}
