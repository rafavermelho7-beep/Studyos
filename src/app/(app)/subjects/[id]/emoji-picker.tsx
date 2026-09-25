"use client";

import { useState, useTransition } from "react";
import { SmilePlus, X } from "lucide-react";
import { EMOJI_GROUPS, emojiLabel, suggestSubjectEmoji } from "@/lib/subject-emojis";
import { cn } from "@/lib/utils";
import { setSubjectEmojiAction } from "../actions";

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function EmojiPicker({
  subjectId,
  subjectName,
  emoji,
  color,
}: {
  subjectId: string;
  subjectName: string;
  emoji: string | null;
  color: string;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(emoji);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();
  const suggestion = suggestSubjectEmoji(subjectName);

  function choose(next: string | null) {
    setCurrent(next);
    setOpen(false);
    setQuery("");
    startTransition(() => setSubjectEmojiAction(subjectId, next));
  }

  const q = normalize(query.trim());
  const groups = EMOJI_GROUPS.map((g) => ({
    ...g,
    items: q ? g.items.filter((i) => normalize(i.label).includes(q)) : g.items,
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={current ? `Trocar emoji (${emojiLabel(current)})` : "Escolher emoji"}
        aria-expanded={open}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] border-2 text-2xl transition-transform duration-150 hover:scale-105 active:scale-95"
        style={{ borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
      >
        {current ?? <SmilePlus className="h-5 w-5 text-muted-foreground" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Escolher emoji da matéria"
          className="animate-scale-in absolute inset-x-0 top-full z-20 mt-2 origin-top rounded-[var(--radius-lg)] border border-border-strong bg-surface p-3 shadow-[var(--shadow-lg)]"
        >
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar (ex: cardio, pediatria, cirurgia)"
              aria-label="Buscar emoji"
              className="h-9 flex-1 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
            />
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {suggestion && !q && suggestion !== current && (
            <button
              type="button"
              onClick={() => choose(suggestion)}
              className="mt-2 flex w-full items-center gap-2 rounded-[var(--radius-sm)] bg-accent-soft px-2.5 py-1.5 text-left text-xs font-medium text-accent"
            >
              <span className="text-lg">{suggestion}</span>
              Sugerido para “{subjectName}” — {emojiLabel(suggestion)}
            </button>
          )}

          <div className="mt-2 max-h-72 space-y-3 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</p>
                <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
                  {group.items.map((item) => (
                    <button
                      key={item.emoji}
                      type="button"
                      title={item.label}
                      aria-label={item.label}
                      aria-pressed={current === item.emoji}
                      onClick={() => choose(item.emoji)}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-[var(--radius-sm)] text-2xl transition-[background-color,transform] duration-100 hover:scale-110 hover:bg-surface-2",
                        current === item.emoji && "bg-accent-soft ring-2 ring-accent",
                      )}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {groups.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Nada encontrado.</p>}
          </div>

          {current && (
            <button
              type="button"
              onClick={() => choose(null)}
              className="mt-2 text-xs font-medium text-muted-foreground hover:text-danger"
            >
              Remover emoji
            </button>
          )}
        </div>
      )}
    </>
  );
}
