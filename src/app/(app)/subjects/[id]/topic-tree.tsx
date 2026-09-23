"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";
import type { ContentStatus, Topic, ReviewState } from "@prisma/client";
import { updateTopicStatusAction, deleteTopicAction } from "../actions";
import { AddTopicForm } from "./add-topic-form";
import { ConfirmDeletePanel } from "@/components/ui/delete-buttons";
import { topicDeletionDetails } from "@/lib/deletion-copy";
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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
          onClick={() => setConfirmingDelete(true)}
          disabled={pending}
          className="text-muted-foreground transition-[color,transform] duration-150 hover:scale-110 hover:text-danger active:scale-95"
          aria-label={`Excluir tópico "${topic.name}"`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {confirmingDelete && (
        <div className="px-3 pb-2">
          <ConfirmDeletePanel
            question={`Excluir "${topic.name}"?`}
            details={topicDeletionDetails(topic.children.length, topic.reviewState !== null)}
            onDelete={() => deleteTopicAction(topic.id, subjectId)}
            onCancel={() => setConfirmingDelete(false)}
          />
        </div>
      )}

      {expanded && (
        <div className="animate-fade-in-up border-t border-border px-3 py-2 pl-9">
          {hasChildren && (
            <ul className="stagger mb-2 space-y-1">
              {topic.children.map((child) => (
                <SubtopicRow key={child.id} subjectId={subjectId} topic={child} />
              ))}
            </ul>
          )}
          <AddTopicForm subjectId={subjectId} parentId={topic.id} />
        </div>
      )}
    </li>
  );
}

function SubtopicRow({ subjectId, topic }: { subjectId: string; topic: Topic }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <li className="rounded-[var(--radius-sm)] bg-surface-2 text-sm transition-colors duration-150 hover:bg-surface">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <Link href={`/topics/${topic.id}`} className="flex-1 truncate text-foreground hover:text-accent hover:underline">
          {topic.name}
        </Link>
        <span className={cn("rounded-full px-2 py-0.5 text-xs", statusConfig[topic.status].className)}>
          {statusConfig[topic.status].label}
        </span>
        <button
          onClick={() => setConfirmingDelete(true)}
          className="text-muted-foreground transition-[color,transform] duration-150 hover:scale-110 hover:text-danger active:scale-95"
          aria-label={`Excluir subtópico "${topic.name}"`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {confirmingDelete && (
        <div className="px-2.5 pb-2">
          <ConfirmDeletePanel
            question={`Excluir "${topic.name}"?`}
            details={topicDeletionDetails(0, true)}
            onDelete={() => deleteTopicAction(topic.id, subjectId)}
            onCancel={() => setConfirmingDelete(false)}
          />
        </div>
      )}
    </li>
  );
}
