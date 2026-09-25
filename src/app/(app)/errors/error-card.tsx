import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UndoableDeleteButton } from "@/components/ui/delete-buttons";
import { SubjectMark } from "@/components/ui/subject-mark";
import { HideIfPendingDelete } from "@/components/ui/undo-toast";
import { ERROR_REASONS, type ErrorReason } from "@/lib/error-review";
import { imageUrl } from "@/lib/images";
import { deleteErrorAction } from "./actions";

export type ErrorCardEntry = {
  id: string;
  question: string | null;
  imageId: string | null;
  source: string | null;
  reason: string;
  lesson: string;
  mastered: boolean;
  createdAt: Date;
  subject: { name: string; color: string; emoji: string | null } | null;
  topic: { id: string; name: string } | null;
};

export function ErrorCard({ entry }: { entry: ErrorCardEntry }) {
  const reason = ERROR_REASONS[entry.reason as ErrorReason];
  return (
    <HideIfPendingDelete id={entry.id}>
      <li className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 transition-colors hover:border-border-strong">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {entry.subject && (
              <span className="flex items-center gap-1">
                <SubjectMark color={entry.subject.color} emoji={entry.subject.emoji} />
                {entry.subject.name}
              </span>
            )}
            {entry.topic && (
              <Link href={`/topics/${entry.topic.id}`} className="hover:text-accent hover:underline">
                · {entry.topic.name}
              </Link>
            )}
            {entry.source && <span>· {entry.source}</span>}
            <span>· {format(entry.createdAt, "d MMM", { locale: ptBR })}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <Link href={`/errors/${entry.id}`} aria-label="Editar erro" className="text-muted-foreground hover:text-accent">
              <Pencil className="h-3.5 w-3.5" />
            </Link>
            <UndoableDeleteButton
              id={entry.id}
              label="Excluir erro"
              message="Erro excluído"
              onDelete={deleteErrorAction.bind(null, entry.id)}
            />
          </div>
        </div>

        {entry.question && <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-foreground">{entry.question}</p>}
        {entry.imageId && (
          <a href={imageUrl(entry.imageId)} target="_blank" rel="noopener noreferrer" className="mt-2 block">
            <span className="relative block h-32 w-full max-w-xs overflow-hidden rounded-[var(--radius-sm)] border border-border">
              <Image src={imageUrl(entry.imageId)} alt="Foto da questão" fill unoptimized sizes="320px" className="object-cover object-top" />
            </span>
          </a>
        )}

        <div className="mt-3 rounded-[var(--radius-md)] border-l-4 border-accent bg-accent-soft/60 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">O que aprendi</p>
          <p className="whitespace-pre-line text-sm text-foreground">{entry.lesson}</p>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="warning">{reason?.label ?? entry.reason}</Badge>
          {entry.mastered && <Badge variant="success">Dominado</Badge>}
        </div>
      </li>
    </HideIfPendingDelete>
  );
}
