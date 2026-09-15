"use client";

import { useOptimistic, useTransition } from "react";
import { addExamTopicAction, removeExamTopicAction } from "../actions";
import { cn } from "@/lib/utils";
import type { ContentStatus } from "@prisma/client";

type TopicOption = { id: string; name: string; status: ContentStatus };

const statusIcon: Record<ContentStatus, string> = {
  NOVO: "⚪",
  APRENDENDO: "🟡",
  REVISANDO: "🟡",
  DOMINADO: "🟢",
};

export function ExamTopicsManager({
  examId,
  allTopics,
  linkedTopicIds,
}: {
  examId: string;
  allTopics: TopicOption[];
  linkedTopicIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [linked, setLinked] = useOptimistic(new Set(linkedTopicIds));

  function toggle(topicId: string, checked: boolean) {
    startTransition(async () => {
      setLinked((prev) => {
        const next = new Set(prev);
        if (checked) next.add(topicId);
        else next.delete(topicId);
        return next;
      });
      if (checked) await addExamTopicAction(examId, topicId);
      else await removeExamTopicAction(examId, topicId);
    });
  }

  if (allTopics.length === 0) {
    return <p className="text-sm text-muted-foreground">Esta matéria ainda não tem tópicos.</p>;
  }

  return (
    <ul className="stagger space-y-1">
      {allTopics.map((topic) => {
        const checked = linked.has(topic.id);
        return (
          <li
            key={topic.id}
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2 text-sm transition-colors duration-150",
              checked ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-border-strong",
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={pending}
              onChange={(e) => toggle(topic.id, e.target.checked)}
              aria-label={`Incluir ${topic.name} na prova`}
              className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
            />
            <span aria-hidden>{statusIcon[topic.status]}</span>
            <span className="text-foreground">{topic.name}</span>
          </li>
        );
      })}
    </ul>
  );
}
