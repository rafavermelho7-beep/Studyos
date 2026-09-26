"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Link2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { allocateMinutes } from "@/lib/vespera";
import { fileIcon } from "@/lib/file-icons";
import { cn } from "@/lib/utils";

export type VesperaTopic = {
  id: string;
  name: string;
  status: "NOVO" | "APRENDENDO" | "REVISANDO" | "DOMINADO";
  retentionPercent: number | null;
  openErrors: number;
  weight: number;
  concepts: { id: string; lesson: string; mastered: boolean; source: string | null }[];
  lessons: {
    id: string;
    title: string;
    attachments: { id: string; kind: string; name: string; url: string | null; contentType: string | null }[];
  }[];
};

const statusLabel = { NOVO: "Não estudado", APRENDENDO: "Aprendendo", REVISANDO: "Revisando", DOMINADO: "Dominado" } as const;
const statusVariant = { NOVO: "danger", APRENDENDO: "warning", REVISANDO: "accent", DOMINADO: "success" } as const;

function formatMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

// The "revisado" checklist is per-device on purpose: it's a tick-list for
// one night, not study history (sessions and reviews record that). Browser
// storage can be unavailable (private mode) — the page still works, it just
// won't remember ticks across reloads.
function useChecklist(examId: string) {
  const key = `vespera:${examId}`;
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser storage
      if (Array.isArray(saved)) setDone(saved.filter((v): v is string => typeof v === "string"));
    } catch {}
  }, [key]);
  function toggle(id: string) {
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  return { done, toggle };
}

export function VesperaPlan({
  examId,
  subjectId,
  topics,
  defaultHours,
}: {
  examId: string;
  subjectId: string;
  topics: VesperaTopic[];
  defaultHours: number;
}) {
  const [hours, setHours] = useState(String(defaultHours));
  const [open, setOpen] = useState<string | null>(topics[0]?.id ?? null);
  const { done, toggle } = useChecklist(examId);
  const minutes = allocateMinutes(
    topics.map((t) => t.weight),
    Math.round((Number(hours.replace(",", ".")) || 0) * 60),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <label htmlFor="vespera-hours" className="text-sm font-medium text-foreground">
          Quanto tempo você tem para revisar?
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="vespera-hours"
            inputMode="decimal"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">horas</span>
        </div>
        <p className="w-full text-xs text-muted-foreground">
          {done.length} de {topics.length} tópicos revisados · do mais fraco para o mais forte
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-300"
            style={{ width: `${topics.length ? (done.length / topics.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <ol className="stagger mt-4 space-y-2">
        {topics.map((topic, i) => {
          const isDone = done.includes(topic.id);
          const expanded = open === topic.id;
          const openConcepts = topic.concepts.filter((c) => !c.mastered);
          const materials = topic.lessons.flatMap((l) => l.attachments.map((a) => ({ ...a, lessonTitle: l.title })));
          return (
            <li
              key={topic.id}
              className={cn(
                "rounded-[var(--radius-lg)] border bg-surface transition-[opacity,border-color]",
                isDone ? "border-success/40 opacity-60" : "border-border",
              )}
            >
              <div className="flex items-center gap-3 p-3">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggle(topic.id)}
                  aria-label={`Marcar "${topic.name}" como revisado`}
                  className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--success)]"
                />
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : topic.id)}
                  aria-expanded={expanded}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                    <span className={cn("truncate font-semibold text-foreground", isDone && "line-through")}>{topic.name}</span>
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <Badge variant={statusVariant[topic.status]}>{statusLabel[topic.status]}</Badge>
                    {topic.retentionPercent !== null && (
                      <Badge variant={topic.retentionPercent < 70 ? "danger" : "neutral"}>~{topic.retentionPercent}% retenção</Badge>
                    )}
                    {topic.openErrors > 0 && (
                      <Badge variant="warning">
                        {topic.openErrors} conceito{topic.openErrors === 1 ? "" : "s"} a fixar
                      </Badge>
                    )}
                  </span>
                </button>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold text-foreground">{minutes[i] ? formatMinutes(minutes[i]) : "—"}</span>
                  <ChevronDown className={cn("ml-auto h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                </span>
              </div>

              {expanded && (
                <div className="animate-fade-in space-y-3 border-t border-border p-3">
                  {topic.concepts.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Conceitos que você errou
                      </p>
                      <ul className="space-y-1">
                        {[...openConcepts, ...topic.concepts.filter((c) => c.mastered)].map((c) => (
                          <li
                            key={c.id}
                            className={cn(
                              "rounded-[var(--radius-sm)] border-l-4 px-2.5 py-1.5 text-sm",
                              c.mastered ? "border-border text-muted-foreground" : "border-accent bg-accent-soft/50 text-foreground",
                            )}
                          >
                            {c.lesson}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {materials.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Materiais das aulas
                      </p>
                      <ul className="space-y-1">
                        {materials.map((m) => {
                          const Icon = m.kind === "LINK" ? Link2 : fileIcon(m.contentType);
                          return (
                            <li key={m.id}>
                              <a
                                href={m.kind === "LINK" ? m.url! : `/api/lesson-files/${m.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-foreground hover:text-accent"
                              >
                                <Icon className="h-4 w-4 shrink-0 text-accent" />
                                <span className="truncate">{m.name}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">· {m.lessonTitle}</span>
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {topic.concepts.length === 0 && materials.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum conceito anotado nem material de aula ligado a este tópico ainda.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Link
                      href={`/sessions?subjectId=${subjectId}&topicId=${topic.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                    >
                      <Play className="h-3 w-3" />
                      Estudar agora
                    </Link>
                    <Link href={`/topics/${topic.id}`} className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
                      Abrir tópico
                    </Link>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
