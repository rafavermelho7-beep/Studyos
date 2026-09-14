"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createExamAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SubjectOption = { id: string; name: string };

export function QuickCreateExam({ subjects }: { subjects: SubjectOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (subjects.length === 0) {
    return (
      <p className="rounded-[var(--radius-lg)] border border-dashed border-border p-4 text-sm text-muted-foreground">
        Crie uma matéria antes de cadastrar uma prova.
      </p>
    );
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nova prova
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(() =>
          createExamAction(formData).then(() => {
            formRef.current?.reset();
            setOpen(false);
          }),
        )
      }
      className="grid grid-cols-1 gap-2 rounded-[var(--radius-lg)] border border-border bg-surface p-4 sm:grid-cols-2"
    >
      <select
        name="subjectId"
        required
        aria-label="Matéria da prova"
        defaultValue=""
        className="h-9 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-accent sm:col-span-2"
      >
        <option value="" disabled>
          Selecione a matéria
        </option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <Input name="name" placeholder="Nome da prova" required maxLength={160} className="sm:col-span-2" />
      <Input name="date" type="date" required aria-label="Data da prova" />
      <Input name="location" placeholder="Local (opcional)" />
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Adicionar prova"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
