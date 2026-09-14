"use client";

import { useOptimistic, useTransition } from "react";
import { Plus } from "lucide-react";
import { startReviewAction } from "./actions";

type TopicOption = { id: string; name: string; subject: { name: string } };

export function AddToReview({ topics }: { topics: TopicOption[] }) {
  const [pending, startTransition] = useTransition();
  const [visible, removeTopic] = useOptimistic(topics, (state, topicId: string) =>
    state.filter((t) => t.id !== topicId),
  );

  if (visible.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-2 text-sm font-semibold text-foreground">Adicionar à revisão</h2>
      <p className="mb-2 text-xs text-muted-foreground">
        Estes tópicos ainda não entraram no sistema de revisão espaçada.
      </p>
      <ul className="space-y-1">
        {visible.map((topic) => (
          <li
            key={topic.id}
            className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-1.5 text-sm"
          >
            <span className="truncate text-foreground">
              {topic.subject.name} · {topic.name}
            </span>
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  removeTopic(topic.id);
                  await startReviewAction(topic.id);
                })
              }
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-50"
            >
              <Plus className="h-3 w-3" /> Iniciar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
