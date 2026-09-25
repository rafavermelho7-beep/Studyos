"use client";

import { useState, useTransition } from "react";
import { Undo2 } from "lucide-react";
import { removeFromReviewAction, undoLastReviewAction } from "../../review/actions";
import { ConfirmDeletePanel } from "@/components/ui/delete-buttons";

export function RemoveFromReviewButton({ topicId, reviewCount }: { topicId: string; reviewCount: number }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <ConfirmDeletePanel
        question="Remover este tópico da revisão espaçada?"
        details={
          reviewCount > 0
            ? `Apaga o histórico de ${reviewCount} ${reviewCount === 1 ? "avaliação" : "avaliações"} e a curva de esquecimento. O tópico continua na matéria e pode voltar pra revisão do zero.`
            : "O tópico continua na matéria e pode voltar pra revisão quando quiser."
        }
        onDelete={() => removeFromReviewAction(topicId)}
        onCancel={() => setConfirming(false)}
      />
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs font-medium text-muted-foreground transition-colors hover:text-danger hover:underline"
    >
      Remover da revisão
    </button>
  );
}

export function UndoLastReviewButton({ topicId }: { topicId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => undoLastReviewAction(topicId))}
      disabled={pending}
      className="flex items-center gap-1 text-xs font-medium text-accent transition-opacity hover:underline active:opacity-70 disabled:opacity-50"
    >
      <Undo2 className="h-3 w-3" />
      {pending ? "Desfazendo..." : "Desfazer"}
    </button>
  );
}
