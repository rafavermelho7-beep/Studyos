"use client";

import { useOptimistic, useTransition } from "react";
import { gradeReviewAction } from "./actions";
import { Badge } from "@/components/ui/badge";

type DueItem = {
  id: string;
  topicId: string;
  topicName: string;
  subjectName: string;
  subjectColor: string;
  retrievabilityPercent: number;
  isNew: boolean;
};

const grades = [
  { rating: 1, label: "Errei", className: "bg-danger text-white hover:opacity-90" },
  { rating: 2, label: "Difícil", className: "bg-warning text-white hover:opacity-90" },
  { rating: 3, label: "Bom", className: "bg-accent text-accent-foreground hover:opacity-90" },
  { rating: 4, label: "Fácil", className: "bg-success text-white hover:opacity-90" },
] as const;

export function ReviewQueue({ items }: { items: DueItem[] }) {
  const [pending, startTransition] = useTransition();
  const [visibleItems, removeItem] = useOptimistic(items, (state, topicId: string) =>
    state.filter((i) => i.topicId !== topicId),
  );

  function grade(topicId: string, rating: number) {
    startTransition(async () => {
      removeItem(topicId);
      await gradeReviewAction(topicId, rating);
    });
  }

  if (visibleItems.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma revisão pendente agora. 🎉</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {visibleItems.map((item) => (
        <li key={item.id} className="rounded-[var(--radius-lg)] border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.subjectColor }} />
                {item.subjectName}
              </div>
              <p className="truncate text-sm font-medium text-foreground">{item.topicName}</p>
            </div>
            {item.isNew ? (
              <Badge variant="accent">Novo</Badge>
            ) : (
              <Badge variant={item.retrievabilityPercent < 70 ? "danger" : "neutral"}>
                ~{item.retrievabilityPercent}% retenção
              </Badge>
            )}
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            {grades.map((g) => (
              <button
                key={g.rating}
                disabled={pending}
                onClick={() => grade(item.topicId, g.rating)}
                className={`rounded-[var(--radius-sm)] py-1.5 text-xs font-medium transition-opacity disabled:opacity-50 ${g.className}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
