"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { SubjectMark } from "@/components/ui/subject-mark";
import { ERROR_REASONS, type ErrorReason } from "@/lib/error-review";
import { imageUrl } from "@/lib/images";
import { reviewErrorAction } from "../actions";
import type { ErrorCardEntry } from "../error-card";

// One card at a time: read the question, try to recall the lesson, reveal,
// then answer honestly.
//
// The queue is snapshotted into state on mount and never re-read from
// props: every answer's server action revalidates, which re-renders this
// page with the SHRUNKEN due list — reading props would shift `index` past
// a card (skipping it) and, after the last one, swap the summary for the
// empty state. The e2e spec caught the latter.
export function ErrorReview({ entries: initialEntries }: { entries: ErrorCardEntry[] }) {
  const [entries] = useState(initialEntries);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ right: 0, wrong: 0 });
  const [pending, startTransition] = useTransition();

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum erro para revisar agora. 🎉</p>;
  }

  if (index >= entries.length) {
    return (
      <div className="animate-fade-in-up rounded-[var(--radius-xl)] border border-border bg-surface p-8 text-center">
        <p className="text-4xl">🎯</p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">Revisão concluída</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {tally.right} fixado{tally.right === 1 ? "" : "s"} · {tally.wrong} para rever amanhã
        </p>
        <Link href="/errors" className={buttonVariants({ className: "mt-5" })}>
          Voltar ao caderno
        </Link>
      </div>
    );
  }

  const entry = entries[index];
  // With the question saved, it's a real recall test: concept hidden until
  // revealed. Without one there's nothing to answer, so the concept shows
  // straight away and the question becomes "já fixou?".
  const hasQuestion = Boolean(entry.question || entry.imageId);
  const showConcept = revealed || !hasQuestion;
  function answer(gotItRight: boolean) {
    startTransition(async () => {
      await reviewErrorAction(entry.id, gotItRight);
      setTally((t) => (gotItRight ? { ...t, right: t.right + 1 } : { ...t, wrong: t.wrong + 1 }));
      setRevealed(false);
      setIndex((i) => i + 1);
    });
  }

  return (
    <div key={entry.id} className="animate-fade-in-up">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {index + 1} de {entries.length}
      </p>
      <div className="h-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(index / entries.length) * 100}%` }} />
      </div>

      <div className="mt-4 rounded-[var(--radius-xl)] border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {entry.subject && (
            <span className="flex items-center gap-1">
              <SubjectMark color={entry.subject.color} emoji={entry.subject.emoji} />
              {entry.subject.name}
            </span>
          )}
          {entry.topic && <span>· {entry.topic.name}</span>}
          {entry.source && <span>· {entry.source}</span>}
        </div>
        {entry.question && <p className="mt-3 whitespace-pre-line text-base text-foreground">{entry.question}</p>}
        {entry.imageId && (
          <span className="relative mt-3 block aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-md)] border border-border">
            <Image src={imageUrl(entry.imageId)} alt="Foto da questão" fill unoptimized sizes="640px" className="object-contain" />
          </span>
        )}

        {showConcept ? (
          <div className="animate-scale-in mt-4 rounded-[var(--radius-md)] border-l-4 border-accent bg-accent-soft/60 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Conceito</p>
            <p className="whitespace-pre-line text-base font-medium text-foreground">{entry.lesson}</p>
            {entry.reason && (
              <p className="mt-1 text-xs text-muted-foreground">
                Motivo do erro: {ERROR_REASONS[entry.reason as ErrorReason]?.label}
              </p>
            )}
          </div>
        ) : (
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setRevealed(true)}>
            Mostrar o conceito
          </Button>
        )}
      </div>

      {showConcept && (
        <div className="animate-fade-in-up mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={pending} onClick={() => answer(false)}>
            <RotateCcw className="h-4 w-4" />
            {hasQuestion ? "Ainda erraria" : "Ainda não fixei"}
          </Button>
          <Button disabled={pending} onClick={() => answer(true)}>
            <Check className="h-4 w-4" />
            {hasQuestion ? "Acertaria agora" : "Já fixei"}
          </Button>
        </div>
      )}
    </div>
  );
}
