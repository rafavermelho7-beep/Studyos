import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Timer } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listSubjects } from "@/server/services/subjects";
import { listTopicsForUser } from "@/server/services/topics";
import { listRecentStudyEvents } from "@/server/services/study-events";
import { FocusSession } from "./focus-session";

export const metadata: Metadata = { title: "Sessão de estudo · StudyOS" };

const sourceLabel = { STUDYOS: "StudyOS", ANKI: "Anki", SANARFLIX: "SanarFlix", MANUAL: "Manual", OTHER: "Outro" };

function formatEventDuration(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

export default async function SessionsPage() {
  const user = await requireUser();
  const [subjects, topics, recentEvents] = await Promise.all([
    listSubjects(user.id),
    listTopicsForUser(user.id),
    listRecentStudyEvents(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Sessão de estudo</h1>

      <FocusSession
        subjects={subjects.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
        topics={topics.map((t) => ({ id: t.id, name: t.name, subjectId: t.subjectId }))}
      />

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Atividade recente</h2>
        {recentEvents.length === 0 ? (
          <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border py-10 text-center">
            <Timer className="mb-2 h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">Nenhuma sessão registrada ainda.</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {recentEvents.map((event) => (
              <li
                key={event.id}
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {event.subject?.name ?? "Estudo livre"}
                    {event.topic && ` · ${event.topic.name}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sourceLabel[event.source]} ·{" "}
                    {formatDistanceToNow(new Date(event.startedAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {formatEventDuration(event.durationSec)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
