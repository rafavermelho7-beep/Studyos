"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { createTaskAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SubjectOption = { id: string; name: string };

export function QuickCreateTask({ subjects }: { subjects: SubjectOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [advanced, setAdvanced] = useState(false);

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(() => createTaskAction(formData).then(() => formRef.current?.reset()))
      }
      className="rounded-[var(--radius-lg)] border border-border bg-surface p-3"
    >
      <div className="flex gap-2">
        <Input name="title" placeholder="Nova tarefa (ex: Resumir arritmias)" required maxLength={200} />
        <Button type="submit" disabled={pending}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setAdvanced((v) => !v)}
        className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advanced ? "rotate-180" : ""}`} />
        Detalhes
      </button>

      {advanced && (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            name="subjectId"
            aria-label="Matéria da tarefa"
            defaultValue=""
            className="h-9 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-accent"
          >
            <option value="">Sem matéria</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            name="priority"
            aria-label="Prioridade da tarefa"
            defaultValue="MEDIUM"
            className="h-9 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-accent"
          >
            <option value="LOW">Baixa prioridade</option>
            <option value="MEDIUM">Média prioridade</option>
            <option value="HIGH">Alta prioridade</option>
          </select>
          <Input name="dueDate" type="date" aria-label="Prazo da tarefa" />
        </div>
      )}
    </form>
  );
}
