"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteExamAction } from "../actions";
import { Button } from "@/components/ui/button";

export function DeleteExamButton({ examId }: { examId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} aria-label="Excluir prova">
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="animate-scale-in flex items-center gap-2 origin-right">
      <span className="text-xs text-muted-foreground">Excluir prova?</span>
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await deleteExamAction(examId);
            router.push("/exams");
          })
        }
      >
        Confirmar
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
    </div>
  );
}
