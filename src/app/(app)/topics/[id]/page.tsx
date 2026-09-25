import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireUser } from "@/lib/auth/session";
import { getTopic } from "@/server/services/topics";
import {
  getTopicReviewHistory,
  getForgettingCurve,
  estimateRetrievability,
  stabilityBeforeLastReview,
} from "@/server/services/reviews";
import { Badge } from "@/components/ui/badge";
import { ForgettingCurveChart } from "./forgetting-curve-chart";
import { StartReviewButton } from "./start-review-button";
import { SourcesSection } from "./sources-section";
import { listLessonsForTopic } from "@/server/services/lessons";
import { listErrorsForTopic } from "@/server/services/errors";
import { ERROR_REASONS, type ErrorReason } from "@/lib/error-review";
import { fileIcon } from "@/lib/file-icons";
import { Link2 } from "lucide-react";
import { RemoveFromReviewButton, UndoLastReviewButton } from "./review-controls";
import { ConfirmDeleteButton } from "@/components/ui/delete-buttons";
import { topicDeletionDetails } from "@/lib/deletion-copy";
import { deleteTopicFromDetailAction } from "../../subjects/actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const topic = await getTopic(user.id, id);
  return { title: topic ? `${topic.name} · StudyOS` : "Tópico · StudyOS" };
}

const ratingLabel: Record<number, string> = { 1: "Errei", 2: "Difícil", 3: "Bom", 4: "Fácil" };
const stateLabel: Record<string, string> = {
  NEW: "Novo",
  LEARNING: "Aprendendo",
  REVIEW: "Em revisão",
  RELEARNING: "Reaprendendo",
};

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const topic = await getTopic(user.id, id);
  if (!topic) notFound();

  const [logs, lessons, errors] = await Promise.all([
    topic.reviewState ? getTopicReviewHistory(user.id, topic.id) : Promise.resolve([]),
    listLessonsForTopic(user.id, topic.id),
    listErrorsForTopic(user.id, topic.id),
  ]);
  const previousStability = stabilityBeforeLastReview(logs);

  const hasCurve = topic.reviewState && topic.reviewState.lastReview;
  const curve = hasCurve
    ? getForgettingCurve(topic.reviewState!, previousStability)
    : null;
  const todayOffset = hasCurve
    ? differenceInCalendarDays(new Date(), topic.reviewState!.lastReview!)
    : 0;
  const retentionNow = hasCurve ? Math.round(estimateRetrievability(topic.reviewState!) * 100) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <Link href={`/subjects/${topic.subjectId}`} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
        ← {topic.subject.name}
      </Link>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">{topic.name}</h1>
        <div className="max-w-sm flex-none">
          <ConfirmDeleteButton
            label="Excluir tópico"
            question={`Excluir "${topic.name}"?`}
            details={topicDeletionDetails(topic.children.length, topic.reviewState !== null)}
            onDelete={deleteTopicFromDetailAction.bind(null, topic.id)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {topic.reviewState ? (
          <>
            <Badge variant="accent">{stateLabel[topic.reviewState.state]}</Badge>
            <Badge variant="neutral">
              Próxima revisão: {format(new Date(topic.reviewState.due), "d 'de' MMM", { locale: ptBR })}
            </Badge>
            {retentionNow !== null && (
              <Badge variant={retentionNow < 70 ? "danger" : "success"}>~{retentionNow}% retenção</Badge>
            )}
          </>
        ) : (
          <StartReviewButton topicId={topic.id} />
        )}
      </div>
      {topic.reviewState && (
        <div className="mt-2">
          <RemoveFromReviewButton topicId={topic.id} reviewCount={logs.length} />
        </div>
      )}

      {curve && (
        <div className="mt-6 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">Curva de esquecimento (estimativa)</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Baseada no modelo FSRS a partir do seu histórico de revisões — não é uma medida exata.
          </p>
          <div className="mt-2">
            <ForgettingCurveChart current={curve.current} previous={curve.previous} todayOffset={todayOffset} />
          </div>
          {curve.previous && (
            <p className="mt-1 text-xs text-muted-foreground">
              A linha tracejada mostra como a retenção teria caído sem sua última revisão.
            </p>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-foreground">Caderno de erros</h2>
            <Link href={`/errors?materia=${topic.subjectId}`} className="text-xs font-medium text-accent hover:underline">
              Ver no caderno
            </Link>
          </div>
          <ul className="stagger space-y-1.5">
            {errors.map((entry) => (
              <li key={entry.id} className="rounded-[var(--radius-md)] border-l-4 border-accent bg-accent-soft/40 px-3 py-2">
                <p className="text-sm text-foreground">{entry.lesson}</p>
                <p className="text-xs text-muted-foreground">
                  {ERROR_REASONS[entry.reason as ErrorReason]?.label}
                  {entry.source ? ` · ${entry.source}` : ""}
                  {entry.mastered ? " · dominado" : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lessons.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Materiais das aulas</h2>
          <ul className="stagger space-y-2">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5">
                <Link href={`/lessons/${lesson.id}`} className="text-sm font-medium text-foreground hover:text-accent hover:underline">
                  {lesson.title}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground">
                  {format(new Date(lesson.date), "d 'de' MMM", { locale: ptBR })}
                </span>
                {lesson.attachments.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {lesson.attachments.map((a) => {
                      const Icon = a.kind === "LINK" ? Link2 : fileIcon(a.contentType);
                      return (
                        <li key={a.id}>
                          <a
                            href={a.kind === "LINK" ? a.url! : `/api/lesson-files/${a.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent"
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{a.name}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Fontes</h2>
        <SourcesSection topicId={topic.id} subjectId={topic.subjectId} sources={topic.studySources} />
      </div>

      {logs.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Histórico de revisões</h2>
          <ul className="stagger space-y-1">
            {[...logs].reverse().map((log, index) => (
              <li
                key={log.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-1.5 text-sm transition-colors duration-150 hover:border-border-strong"
              >
                <span className="flex-1 text-foreground">{ratingLabel[log.rating]}</span>
                {index === 0 && <UndoLastReviewButton topicId={topic.id} />}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(log.reviewedAt), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
