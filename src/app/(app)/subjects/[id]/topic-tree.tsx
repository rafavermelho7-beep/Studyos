"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";
import type { ContentStatus, Topic, ReviewState } from "@prisma/client";
import { updateTopicStatusAction, deleteTopicAction } from "../actions";
import { AddTopicForm } from "./add-topic-form";
import { cn } from "@/lib/utils";

type TopicWithChildren = Topic & {
  children: Topic[];
  reviewState: ReviewState | null;
};

const statusConfig: Record<ContentStatus, { label: string; className: string }> = {
  NOVO: { label: "Novo", className: "bg-surface-2 text-muted-foreground" },
  APRENDENDO: { label: "Aprendendo", className: "bg-warning-soft text-warning" },
  REVISANDO: { label: "Revisando", className: "bg-accent-soft text-accent" },
  DOMINADO: { label: "Dominado", className: "bg-success-soft text-success" },
};

export function TopicTree({
  subjectId,
  topics,
}: {
  subjectId: string;
  topics: TopicWithChildren[];
}) {
  if (topics.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum tópico ainda.</p>;
  }

  return (
    <ul className="stagger space-y-1">
      {topics.map((topic) => (
        <TopicRow key={topic.id} subjectId={subjectId} topic={topic} />
      ))}
    </ul>
  );
}

function TopicRow({ subjectId, topic }: { subjectId: string; topic: TopicWithChildren }) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const hasChildren = topic.children.length > 0;

  return (
    <li className="rounded-[var(--radius-md)] border border-border bg-surface transition-colors duration-150 hover:border-border-strong">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Expandir"
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform duration-200 ease-out", expanded && "rotate-90")} />
        </button>
        <Link
          href={`/topics/${topic.id}`}
          className="flex-1 truncate text-sm font-medium text-foreground transition-colors hover:text-accent hover:underline"
        >
          {topic.name}
        </Link>
        <select
          aria-label={`Status de ${topic.name}`}
          value={topic.status}
          disabled={pending}
          onChange={(e) =>
            startTransition(() => updateTopicStatusAction(topic.id, subjectId, e.target.value))
          }
          className={cn(
            "rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none transition-[filter] duration-150 hover:brightness-95",
            statusConfig[topic.status].className,
          )}
        >
          {Object.entries(statusConfig).map(([value, cfg]) => (
            <option key={value} value={value}>
              {cfg.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => startTransition(() => deleteTopicAction(topic.id, subjectId))}
          disabled={pending}
          className="text-muted-foreground transition-[color,transform] duration-150 hover:scale-110 hover:text-danger active:scale-95"
          aria-label="Excluir tópico"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="animate-fade-in-up border-t border-border px-3 py-2 pl-9">
          {hasChildren && (
            <ul className="stagger mb-2 space-y-1">
              {topic.children.map((child) => (
                <li
                  key={child.id}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] bg-surface-2 px-2.5 py-1.5 text-sm transition-colors duration-150 hover:bg-surface"
                >
                  <Link href={`/topics/${child.id}`} className="truncate text-foreground hover:text-accent hover:underline">
                    {child.name}
                  </Link>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", statusConfig[child.status].className)}>
                    {statusConfig[child.status].label}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <AddTopicForm subjectId={subjectId} parentId={topic.id} />
        </div>
      )}
    </li>
  );
}
