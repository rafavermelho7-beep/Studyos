"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import type { StudySource } from "@prisma/client";
import {
  createSourceAction,
  toggleSourceCompletedAction,
  deleteSourceAction,
  logSourceTimeAction,
} from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const typeOptions: { value: string; label: string }[] = [
  { value: "SANARFLIX", label: "SanarFlix" },
  { value: "ANKI", label: "Anki" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "PDF", label: "PDF" },
  { value: "BOOK", label: "Livro" },
  { value: "COURSE", label: "Curso" },
  { value: "QUESTIONS", label: "Questões" },
  { value: "CLASS", label: "Aula" },
  { value: "FLASHCARDS", label: "Flashcards" },
  { value: "OTHER", label: "Outro" },
];

export function SourcesSection({
  topicId,
  subjectId,
  sources,
}: {
  topicId: string;
  subjectId: string;
  sources: StudySource[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <div>
      {sources.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {sources.map((source) => (
            <SourceRow key={source.id} source={source} topicId={topicId} />
          ))}
        </ul>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
        >
          <Plus className="h-3 w-3" /> Adicionar fonte
        </button>
      ) : (
        <form
          ref={formRef}
          action={(formData) =>
            startTransition(() =>
              createSourceAction(topicId, subjectId, formData).then(() => {
                formRef.current?.reset();
                setOpen(false);
              }),
            )
          }
          className="flex flex-wrap gap-2 rounded-[var(--radius-sm)] border border-border bg-surface p-2.5"
        >
          <select
            name="type"
            defaultValue="SANARFLIX"
            aria-label="Tipo de fonte"
            className="h-8 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-xs text-foreground"
          >
            {typeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <Input name="title" placeholder="Título" required maxLength={160} className="h-8 flex-1 text-xs" />
          <Input name="url" placeholder="URL (opcional)" type="url" className="h-8 flex-1 text-xs" />
          <Button type="submit" size="sm" disabled={pending}>
            Adicionar
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </form>
      )}
    </div>
  );
}

function SourceRow({ source, topicId }: { source: StudySource; topicId: string }) {
  const [pending, startTransition] = useTransition();
  const [logging, setLogging] = useState(false);
  const [minutes, setMinutes] = useState("30");
  const [completed, setOptimisticCompleted] = useOptimistic(source.completed);

  return (
    <li className="rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1.5">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={completed}
          disabled={pending}
          onChange={(e) => {
            const checked = e.target.checked;
            startTransition(async () => {
              setOptimisticCompleted(checked);
              await toggleSourceCompletedAction(source.id, topicId, checked);
            });
          }}
          aria-label={`Marcar "${source.title}" como concluída`}
          className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
        />
        <span
          className={`min-w-0 flex-1 truncate text-sm text-foreground ${completed ? "text-muted-foreground line-through" : ""}`}
        >
          {source.title}
        </span>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-muted-foreground hover:text-accent"
            aria-label={`Abrir ${source.title}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          onClick={() => setLogging((v) => !v)}
          className="shrink-0 text-xs font-medium text-accent hover:underline"
        >
          Registrar tempo
        </button>
        <button
          onClick={() => startTransition(() => deleteSourceAction(source.id, topicId))}
          disabled={pending}
          aria-label={`Excluir fonte "${source.title}"`}
          className="shrink-0 text-muted-foreground hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {logging && (
        <div className="mt-1.5 flex items-center gap-2 pl-5.5">
          <Input
            type="number"
            min={1}
            max={600}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="h-7 w-20 px-2 text-xs"
            aria-label="Minutos estudados"
          />
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await logSourceTimeAction(source.id, topicId, Number(minutes) || 0);
                setLogging(false);
              })
            }
          >
            Salvar
          </Button>
        </div>
      )}
    </li>
  );
}
