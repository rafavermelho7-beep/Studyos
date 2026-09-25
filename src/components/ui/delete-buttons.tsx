"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUndoToast } from "@/components/ui/undo-toast";
import { cn } from "@/lib/utils";

// The two delete patterns used across the app:
// - UndoableDeleteButton: small, self-contained rows (task, source, session,
//   deck link, exam in a list). Hides the row now, deletes after the undo
//   window — see undo-toast.tsx.
// - ConfirmDeleteButton: deletes that cascade into a lot of other data
//   (subject, topic). Asks first and spells out what goes with it.

const iconButtonClass =
  "shrink-0 text-muted-foreground transition-[color,transform] duration-150 hover:scale-110 hover:text-danger active:scale-95 disabled:opacity-50";

export function UndoableDeleteButton({
  id,
  label,
  message,
  onDelete,
  className,
}: {
  id: string;
  /** Accessible name, e.g. `Excluir tarefa "Ler capítulo 3"`. */
  label: string;
  /** Toast text, e.g. "Tarefa excluída". */
  message: string;
  onDelete: () => Promise<unknown>;
  className?: string;
}) {
  const { scheduleDelete } = useUndoToast();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        scheduleDelete({ id, message, commit: onDelete });
      }}
      aria-label={label}
      className={cn(iconButtonClass, className)}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

export function ConfirmDeleteButton({
  label,
  size = "md",
  ...panel
}: {
  label: string;
  size?: "sm" | "md";
} & Omit<ConfirmDeletePanelProps, "onCancel">) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) return <ConfirmDeletePanel {...panel} onCancel={() => setConfirming(false)} />;

  return size === "sm" ? (
    <button type="button" onClick={() => setConfirming(true)} aria-label={label} className={iconButtonClass}>
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  ) : (
    <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} aria-label={label}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

type ConfirmDeletePanelProps = {
  question: string;
  /** What else goes with it, e.g. "Isso apaga 3 subtópicos e o histórico de revisão." */
  details?: string;
  onDelete: () => Promise<unknown>;
  onCancel: () => void;
};

/** The confirmation itself, for callers that need to place it somewhere other than where the trigger is. */
export function ConfirmDeletePanel({ question, details, onDelete, onCancel }: ConfirmDeletePanelProps) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="alertdialog"
      aria-label={question}
      className="animate-scale-in w-full origin-top-right rounded-[var(--radius-md)] border border-danger/40 bg-danger-soft/40 p-2.5"
    >
      <p className="text-xs font-medium text-foreground">{question}</p>
      {details && <p className="mt-0.5 text-xs text-muted-foreground">{details}</p>}
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              // Page-level deletes redirect from the server action itself,
              // so this line only runs for in-place ones.
              await onDelete();
              onCancel();
            })
          }
        >
          {pending ? "Excluindo..." : "Excluir"}
        </Button>
      </div>
    </div>
  );
}
