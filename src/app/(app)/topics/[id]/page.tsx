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

  const logs = topic.reviewState ? await getTopicReviewHistory(user.id, topic.id) : [];
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
