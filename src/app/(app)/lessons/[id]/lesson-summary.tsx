"use client";

import { useEffect, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { extractHeadingTopics, MAX_SUMMARY_LENGTH, topicKey } from "@/lib/summary-topics";
import { cn } from "@/lib/utils";
import { createTopicsFromSummaryAction, saveLessonSummaryAction } from "../actions";

/**
 * The lesson's summary, as plain text. Lines starting with "#" are the
 * user's way of saying "this is a topic" (lib/summary-topics.ts) — they're
 * listed live below the text, and one click creates the missing ones in the
 * lesson's subject and links them all to this lesson.
 */
export function LessonSummary({
  lessonId,
  initialSummary,
  subjectTopics,
  linkedTopicIds,
}: {
  lessonId: string;
  initialSummary: string;
  subjectTopics: { id: string; name: string }[];
  linkedTopicIds: string[];
}) {
  const [text, setText] = useState(initialSummary);
  const [savedText, setSavedText] = useState(initialSummary);
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = text !== savedText;

  // Don't lose a long summary to a closed tab.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const existingByKey = new Map(subjectTopics.map((t) => [topicKey(t.name), t.id]));
  const headings = extractHeadingTopics(text).map((name) => {
    const id = existingByKey.get(topicKey(name));
    return { name, key: topicKey(name), state: id ? (linkedTopicIds.includes(id) ? "linked" : "exists") : "new" } as const;
  });
  const toApply = headings.filter((h) => h.state !== "linked" && !unchecked.has(h.key));

  async function save() {
    const result = await saveLessonSummaryAction(lessonId, text);
    if (result.error) {
      setMessage({ kind: "error", text: result.error });
      return false;
    }
    setSavedText(text);
    return true;
  }

  function onSave() {
    setMessage(null);
    startTransition(async () => {
      if (await save()) setMessage({ kind: "ok", text: "✓ Resumo salvo" });
    });
  }

  function onCreateTopics() {
    setMessage(null);
    startTransition(async () => {
      // The topics come from the text on screen, so save that text too.
      if (dirty && !(await save())) return;
      const result = await createTopicsFromSummaryAction(lessonId, toApply.map((h) => h.name));
      if (result.error) return setMessage({ kind: "error", text: result.error });
      const created = result.created ?? 0;
      setMessage({
        kind: "ok",
        text:
          created > 0
            ? `✓ ${created} tópico${created === 1 ? " criado" : "s criados"} e ligado${created === 1 ? "" : "s"} à aula`
            : "✓ Tópicos ligados à aula",
      });
    });
  }

  return (
    <div className="space-y-3">
      <Textarea
        aria-label="Resumo da aula"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "s") {
            e.preventDefault();
            if (dirty && !pending) onSave();
          }
        }}
        rows={14}
        maxLength={MAX_SUMMARY_LENGTH}
        placeholder={"Escreva o resumo da aula. Comece uma linha com # para virar tópico:\n\n# Sífilis\nTreponema pallidum. VDRL para rastreio, FTA-Abs confirma...\n\n# HPV\nSubtipos 16 e 18 oncogênicos..."}
        className="min-h-[18rem] font-[inherit] leading-relaxed"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={onSave} disabled={pending || !dirty}>
          {pending ? "Salvando..." : "Salvar resumo"}
        </Button>
        {dirty && !pending && <span className="text-xs text-warning">Alterações não salvas</span>}
        {message && (
          <span
            role={message.kind === "error" ? "alert" : "status"}
            className={cn("text-xs", message.kind === "error" ? "text-danger" : "text-success")}
          >
            {message.text}
          </span>
        )}
      </div>

      <div className="rounded-[var(--radius-md)] border border-border bg-surface-2 p-3">
        <p className="text-xs font-semibold text-foreground">Tópicos no resumo</p>
        {headings.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Nenhum ainda. Comece uma linha com <code className="font-semibold">#</code> (ex: <code># Sífilis</code>) e ela
            vira um tópico desta matéria.
          </p>
        ) : (
          <>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {headings.map((h) =>
                h.state === "linked" ? (
                  <li
                    key={h.key}
                    className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
                  >
                    <Check className="h-3 w-3" /> {h.name}
                  </li>
                ) : (
                  <li key={h.key}>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={!unchecked.has(h.key)}
                        onChange={(e) =>
                          setUnchecked((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.delete(h.key);
                            else next.add(h.key);
                            return next;
                          })
                        }
                        className="accent-[var(--accent)]"
                      />
                      {h.name}
                      <span className="text-muted-foreground">{h.state === "new" ? "· novo" : "· já existe"}</span>
                    </label>
                  </li>
                ),
              )}
            </ul>
            {toApply.length > 0 && (
              <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={onCreateTopics} disabled={pending}>
                {headings.some((h) => h.state === "new" && !unchecked.has(h.key))
                  ? `Criar e ligar ${toApply.length} tópico${toApply.length === 1 ? "" : "s"}`
                  : `Ligar ${toApply.length} tópico${toApply.length === 1 ? "" : "s"} à aula`}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
