import type { Metadata } from "next";
import Link from "next/link";
import { Network } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getKnowledgeMap, type MapStatus } from "@/server/services/knowledge-map";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mapa de conhecimento · StudyOS" };

const statusMeta: Record<MapStatus, { icon: string; label: string; className: string }> = {
  DOMINADO: { icon: "🟢", label: "Dominado", className: "bg-success-soft border-success/30" },
  ATENCAO: { icon: "🟡", label: "Atenção", className: "bg-warning-soft border-warning/30" },
  ATRASADO: { icon: "🔴", label: "Revisão atrasada", className: "bg-danger-soft border-danger/30" },
  NAO_ESTUDADO: { icon: "⚪", label: "Não estudado", className: "bg-surface-2 border-border" },
};

export default async function KnowledgeMapPage() {
  const user = await requireUser();
  const subjects = await getKnowledgeMap(user.id);
  const totalTopics = subjects.reduce((sum, s) => sum + s.topics.length, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Mapa de conhecimento</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Visão global de {totalTopics} tópico{totalTopics === 1 ? "" : "s"}
      </p>

      <div className="mb-6 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(Object.keys(statusMeta) as MapStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-1">
            {statusMeta[status].icon} {statusMeta[status].label}
          </span>
        ))}
      </div>

      {totalTopics === 0 ? (
        <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border py-16 text-center">
          <Network className="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            Cadastre matérias e tópicos para ver seu mapa de conhecimento.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {subjects
            .filter((s) => s.topics.length > 0)
            .map((subject) => (
              <div key={subject.id}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color }} />
                    {subject.name}
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {(Object.keys(statusMeta) as MapStatus[])
                      .filter((s) => subject.counts[s] > 0)
                      .map((s) => (
                        <span key={s}>
                          {statusMeta[s].icon} {subject.counts[s]}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {subject.topics.map((topic) => (
                    <Link
                      key={topic.id}
                      href={`/topics/${topic.id}`}
                      title={`${topic.name} — ${statusMeta[topic.mapStatus].label}`}
                      className={cn(
                        "flex h-9 min-w-[2.25rem] max-w-[9rem] items-center justify-center truncate rounded-[var(--radius-sm)] border px-2 text-xs font-medium text-foreground transition-transform hover:scale-105",
                        statusMeta[topic.mapStatus].className,
                      )}
                    >
                      {topic.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
