import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireUser } from "@/lib/auth/session";
import { getExam } from "@/server/services/exams";
import { getSubject } from "@/server/services/subjects";
import { computeExamPrep } from "@/lib/exam-prep";
import { ExamTopicsManager } from "./exam-topics-manager";
import { ConfirmDeleteButton } from "@/components/ui/delete-buttons";
import { deleteExamFromDetailAction } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const exam = await getExam(user.id, id);
  return { title: exam ? `${exam.name} · StudyOS` : "Prova · StudyOS" };
}

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const exam = await getExam(user.id, id);
  if (!exam) notFound();

  const subject = await getSubject(user.id, exam.subjectId);
  const allTopics = (subject?.topics ?? []).flatMap((t) => [
    { id: t.id, name: t.name, status: t.status },
    ...t.children.map((c) => ({ id: c.id, name: `${t.name} / ${c.name}`, status: c.status })),
  ]);

  const daysRemaining = differenceInCalendarDays(new Date(exam.date), new Date());
  const prep = computeExamPrep(exam.topics);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: exam.subject.color }} />
            {exam.subject.name}
          </div>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight">{exam.name}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(exam.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {exam.location && ` · ${exam.location}`}
          </p>
        </div>
        <div className="max-w-sm flex-none">
          <ConfirmDeleteButton
            label="Excluir prova"
            question={`Excluir "${exam.name}"?`}
            details="Os tópicos continuam na matéria; só a prova e a lista de conteúdos dela são apagadas."
            onDelete={deleteExamFromDetailAction.bind(null, exam.id)}
          />
        </div>
      </div>

      <div className="stagger grid grid-cols-2 gap-3">
        <div className="hover-lift rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <p className="text-xs text-muted-foreground">Dias restantes</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {daysRemaining < 0 ? "—" : daysRemaining}
          </p>
        </div>
        <div className="hover-lift rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <p className="text-xs text-muted-foreground">Preparação</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {prep.percent === null ? "—" : `${prep.percent}%`}
          </p>
        </div>
      </div>

      {prep.total > 0 && (
        <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
          <span>🔴 {prep.notStarted} não estudados</span>
          <span>🟡 {prep.inProgress} em progresso</span>
          <span>🟢 {prep.dominated} dominados</span>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Conteúdo da prova</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Marque os tópicos de {exam.subject.name} que vão cair nesta prova.
        </p>
        <ExamTopicsManager
          examId={exam.id}
          allTopics={allTopics}
          linkedTopicIds={exam.topics.map((et) => et.topic.id)}
        />
      </div>
    </div>
  );
}
