"use client";

import { useState } from "react";
import { ChevronDown, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Open/closed is client state seeded once. A server-driven `<details open>`
 * snapped shut on the revalidation after the first save (the notebook stops
 * being empty), right when you'd want to log the next question.
 */
export function AddErrorPanel({ initiallyOpen, children }: { initiallyOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <div className="mt-6 rounded-[var(--radius-lg)] border border-border bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-foreground"
      >
        <NotebookPen className="h-4 w-4 text-accent" />
        <span className="flex-1">Registrar erro</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="animate-fade-in border-t border-border p-4">{children}</div>}
    </div>
  );
}
