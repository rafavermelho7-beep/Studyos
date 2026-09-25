"use client";

import { useRef, useState, useTransition } from "react";
import { Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UndoableDeleteButton } from "@/components/ui/delete-buttons";
import { useUndoToast } from "@/components/ui/undo-toast";
import { addLessonLinkAction, deleteLessonAttachmentAction } from "../actions";

type LinkRow = { id: string; name: string; url: string | null };

export function LessonLinks({ lessonId, links }: { lessonId: string; links: LinkRow[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { isPendingDelete } = useUndoToast();

  return (
    <div>
      <form
        ref={formRef}
        action={(formData) => {
          // Reset at submit time (quick-create convention), keep the result for errors.
          formRef.current?.reset();
          startTransition(async () => {
            const result = await addLessonLinkAction(lessonId, formData);
            setError(result.error);
          });
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <Input name="url" type="url" required placeholder="Cole o link (Drive, vídeo, artigo...)" aria-label="Link" />
        <Input name="name" placeholder="Nome (opcional)" aria-label="Nome do link" className="sm:w-48" />
        <Button type="submit" size="md" variant="secondary" disabled={pending}>
          <Plus className="h-4 w-4" />
          Adicionar link
        </Button>
      </form>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}

      <ul className="stagger mt-3 space-y-1.5">
        {links
          .filter((l) => !isPendingDelete(l.id))
          .map((link) => (
            <li
              key={link.id}
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5 transition-colors hover:border-border-strong"
            >
              <Link2 className="h-5 w-5 shrink-0 text-accent" />
              <a href={link.url!} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground hover:underline">{link.name}</p>
                <p className="truncate text-xs text-muted-foreground">{link.url}</p>
              </a>
              <UndoableDeleteButton
                id={link.id}
                label={`Excluir link "${link.name}"`}
                message="Link excluído"
                onDelete={() => deleteLessonAttachmentAction(link.id)}
              />
            </li>
          ))}
      </ul>
    </div>
  );
}
