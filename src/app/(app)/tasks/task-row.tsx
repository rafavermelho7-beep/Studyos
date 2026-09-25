"use client";

import { useOptimistic, useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { setTaskStatusAction, deleteTaskAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { UndoableDeleteButton } from "@/components/ui/delete-buttons";
import { useUndoToast } from "@/components/ui/undo-toast";
import { cn } from "@/lib/utils";
import type { TaskWithMeta } from "@/server/services/tasks";
import { SubjectMark } from "@/components/ui/subject-mark";

const priorityLabel = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" } as const;

export function TaskRow({ task }: { task: TaskWithMeta }) {
  const [pending, startTransition] = useTransition();
  const [done, setOptimisticDone] = useOptimistic(task.status === "DONE");
  const { isPendingDelete } = useUndoToast();
  if (isPendingDelete(task.id)) return null;

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5 transition-[opacity,border-color] duration-200 hover:border-border-strong",
        done && "opacity-60",
      )}
    >
      <input
        type="checkbox"
        checked={done}
        disabled={pending}
        aria-label={`Marcar "${task.title}" como concluída`}
        onChange={(e) => {
          const checked = e.target.checked;
          startTransition(async () => {
            setOptimisticDone(checked);
            await setTaskStatusAction(task.id, checked ? "DONE" : "TODO");
          });
        }}
        className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
      />

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium text-foreground", done && "line-through")}>
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {task.subject && (
            <span className="flex items-center gap-1">
              <SubjectMark color={task.subject.color} emoji={task.subject.emoji} />
              {task.subject.name}
            </span>
          )}
          {task.dueDate && (
            <span>{format(new Date(task.dueDate), "d 'de' MMM", { locale: ptBR })}</span>
          )}
          {task.estimatedMinutes && <span>{task.estimatedMinutes} min</span>}
        </div>
      </div>

      {task.overdue && <Badge variant="danger">Atrasada</Badge>}
      <Badge variant={task.priority === "HIGH" ? "danger" : task.priority === "MEDIUM" ? "warning" : "neutral"}>
        {priorityLabel[task.priority]}
      </Badge>

      {!done && task.status === "TODO" && (
        <button
          onClick={() => startTransition(() => setTaskStatusAction(task.id, "IN_PROGRESS"))}
          disabled={pending}
          className="text-xs font-medium text-accent transition-opacity hover:underline active:opacity-70"
        >
          Iniciar
        </button>
      )}
      {task.status === "IN_PROGRESS" && <Badge variant="accent">Em andamento</Badge>}

      <UndoableDeleteButton
        id={task.id}
        label={`Excluir tarefa "${task.title}"`}
        message="Tarefa excluída"
        onDelete={() => deleteTaskAction(task.id)}
      />
    </li>
  );
}
