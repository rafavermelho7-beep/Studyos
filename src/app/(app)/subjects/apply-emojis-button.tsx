"use client";

import { useTransition } from "react";
import { Sparkles } from "lucide-react";
import { applySuggestedEmojisAction } from "./actions";

/** One tap to give existing subjects (created before emojis existed) their suggested emoji. */
export function ApplyEmojisButton({ preview }: { preview: string[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => void (await applySuggestedEmojisAction()))}
      className="animate-fade-in-up mt-4 flex w-full items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-accent/50 bg-accent-soft/50 px-4 py-3 text-left text-sm font-medium text-accent transition-colors hover:bg-accent-soft disabled:opacity-60"
    >
      <Sparkles className="h-4 w-4 shrink-0" />
      <span className="flex-1">{pending ? "Aplicando..." : "Adicionar emojis sugeridos às suas matérias"}</span>
      <span className="text-lg tracking-widest">{preview.slice(0, 5).join("")}</span>
    </button>
  );
}
