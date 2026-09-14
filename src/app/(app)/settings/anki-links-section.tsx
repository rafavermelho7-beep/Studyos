"use client";

import { useRef, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { createAnkiDeckLinkAction, deleteAnkiDeckLinkAction } from "./anki-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SubjectOption = { id: string; name: string };
type TopicOption = { id: string; name: string; subjectId: string };
type Link = {
  id: string;
  deckName: string;
  subject: { name: string; color: string };
  topic: { name: string } | null;
};

export function AnkiLinksSection({
  links,
  subjects,
  topics,
}: {
  links: Link[];
  subjects: SubjectOption[];
  topics: TopicOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-foreground">Decks do Anki</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Associe o nome de um deck do Anki (ex: <code>Cardio::Arritmias</code>) a uma matéria e,
        opcionalmente, a um tópico. Um vínculo num deck &ldquo;pai&rdquo; cobre seus subdecks
        automaticamente.
      </p>

      {links.length > 0 && (
        <ul className="mt-3 space-y-1">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-2.5 py-1.5 text-sm"
            >
              <code className="min-w-0 flex-1 truncate text-xs text-foreground">{link.deckName}</code>
              <span className="shrink-0 text-xs text-muted-foreground">
                → {link.subject.name}
                {link.topic && ` / ${link.topic.name}`}
              </span>
              <button
                onClick={() => startTransition(() => deleteAnkiDeckLinkAction(link.id))}
                disabled={pending}
                aria-label={`Remover vínculo de ${link.deckName}`}
                className="shrink-0 text-muted-foreground hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={(formData) =>
          startTransition(() => createAnkiDeckLinkAction(formData).then(() => formRef.current?.reset()))
        }
        className="mt-3 flex flex-wrap gap-2"
      >
        <Input name="deckName" placeholder="Nome do deck no Anki" required className="h-8 flex-1 text-xs" />
        <select
          name="subjectId"
          required
          aria-label="Matéria do vínculo"
          defaultValue=""
          className="h-8 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-xs text-foreground"
        >
          <option value="" disabled>
            Matéria
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          name="topicId"
          aria-label="Tópico do vínculo (opcional)"
          defaultValue=""
          className="h-8 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-xs text-foreground"
        >
          <option value="">Sem tópico específico</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={pending}>
          Vincular
        </Button>
      </form>
    </div>
  );
}
