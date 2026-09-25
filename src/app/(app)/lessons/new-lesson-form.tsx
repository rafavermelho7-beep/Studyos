"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createLessonAction } from "./actions";

/**
 * Title + date (defaulting to today IN THE BROWSER'S timezone — the
 * server's "today" is UTC and would be tomorrow after 21h in Brazil).
 * With `subjects`, also asks which subject; otherwise it's for `subjectId`.
 */
export function NewLessonForm({
  subjectId,
  subjects,
}: {
  subjectId?: string;
  subjects?: { id: string; name: string; emoji: string | null }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [chosenSubject, setChosenSubject] = useState(subjectId ?? subjects?.[0]?.id ?? "");

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          // Redirects to the new lesson on success.
          const result = await createLessonAction(chosenSubject, formData);
          if (result?.error) setError(result.error);
        })
      }
      className="flex flex-col gap-2 sm:flex-row"
    >
      {subjects && (
        <select
          aria-label="Matéria da aula"
          value={chosenSubject}
          onChange={(e) => setChosenSubject(e.target.value)}
          className="h-9 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-accent sm:w-48"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.emoji ? `${s.emoji} ` : ""}
              {s.name}
            </option>
          ))}
        </select>
      )}
      <Input name="title" required maxLength={160} placeholder="Título da aula (ex: Aula 5 – Pré-natal)" aria-label="Título da aula" />
      <Input
        name="date"
        type="date"
        required
        aria-label="Data da aula"
        defaultValue={format(new Date(), "yyyy-MM-dd")}
        suppressHydrationWarning
        className="sm:w-40"
      />
      <Button type="submit" disabled={pending || !chosenSubject}>
        <Plus className="h-4 w-4" />
        {pending ? "Criando..." : "Nova aula"}
      </Button>
      {error && <p role="alert" className="text-xs text-danger sm:self-center">{error}</p>}
    </form>
  );
}
