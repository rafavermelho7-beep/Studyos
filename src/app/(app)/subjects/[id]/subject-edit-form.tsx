"use client";

import { useTransition, useState } from "react";
import type { Subject } from "@prisma/client";
import { updateSubjectAction } from "../actions";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const priorities = [
  { value: 1, label: "Alta prioridade" },
  { value: 2, label: "Média prioridade" },
  { value: 3, label: "Baixa prioridade" },
];

export function SubjectEditForm({ subject }: { subject: Subject }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const action = updateSubjectAction.bind(null, subject.id);

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          await action(formData);
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        })
      }
      className="grid grid-cols-1 gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 sm:grid-cols-2"
    >
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={subject.name} required maxLength={120} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" defaultValue={subject.description ?? ""} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="professor">Professor</Label>
        <Input id="professor" name="professor" defaultValue={subject.professor ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="semester">Semestre</Label>
        <Input id="semester" name="semester" defaultValue={subject.semester ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="priority">Prioridade</Label>
        <select
          id="priority"
          name="priority"
          defaultValue={subject.priority}
          className="h-9 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-accent"
        >
          {priorities.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="color">Cor</Label>
        <input
          id="color"
          name="color"
          type="color"
          defaultValue={subject.color}
          className="h-9 w-full cursor-pointer rounded-[var(--radius-sm)] border border-border bg-surface"
        />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
        {saved && <span className="animate-fade-in-up text-xs text-success">✓ Salvo</span>}
      </div>
    </form>
  );
}
