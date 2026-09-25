"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil } from "lucide-react";
import type { EventSource } from "@prisma/client";
import { deleteStudyEventAction, updateStudyEventDurationAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UndoableDeleteButton } from "@/components/ui/delete-buttons";
import { useUndoToast } from "@/components/ui/undo-toast";

const sourceLabel: Record<EventSource, string> = {
  STUDYOS: "StudyOS",
  ANKI: "Anki",
  SANARFLIX: "SanarFlix",
  MANUAL: "Manual",
  OTHER: "Outro",
};

export type RecentEvent = {
  id: string;
  source: EventSource;
  startedAt: Date;
  durationSec: number;
  subject: { name: string } | null;
  topic: { name: string } | null;
};

function formatEventDuration(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

export function RecentActivity({ events }: { events: RecentEvent[] }) {
  return (
    <ul className="stagger space-y-1.5">
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </ul>
  );
}

function EventRow({ event }: { event: RecentEvent }) {
  const [editing, setEditing] = useState(false);
  const [minutes, setMinutes] = useState(String(Math.max(1, Math.round(event.durationSec / 60))));
  const [pending, startTransition] = useTransition();
  const { isPendingDelete } = useUndoToast();
  if (isPendingDelete(event.id)) return null;

  const title = `${event.subject?.name ?? "Estudo livre"}${event.topic ? ` · ${event.topic.name}` : ""}`;

  return (
    <li className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5 text-sm transition-colors duration-150 hover:border-border-strong">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">
            {sourceLabel[event.source]} ·{" "}
            {formatDistanceToNow(new Date(event.startedAt), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {formatEventDuration(event.durationSec)}
        </span>
        <button
          onClick={() => setEditing((v) => !v)}
          aria-label={`Editar duração de "${title}"`}
          className="shrink-0 text-muted-foreground transition-[color,transform] duration-150 hover:scale-110 hover:text-accent active:scale-95"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <UndoableDeleteButton
          id={event.id}
          label={`Excluir sessão "${title}"`}
          message="Sessão excluída"
          onDelete={() => deleteStudyEventAction(event.id)}
        />
      </div>
      {editing && (
        <form
          className="animate-fade-in-up mt-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await updateStudyEventDurationAction(event.id, Number(minutes) || 0);
              setEditing(false);
            });
          }}
        >
          <Input
            type="number"
            min={1}
            max={1440}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="h-8 w-24 text-xs"
            aria-label="Duração em minutos"
          />
          <span className="text-xs text-muted-foreground">min</span>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </form>
      )}
    </li>
  );
}
