import type { Metadata } from "next";
import Link from "next/link";
import { Library, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listAllSources } from "@/server/services/sources";

export const metadata: Metadata = { title: "Fontes · StudyOS" };

const typeLabel: Record<string, string> = {
  ANKI: "Anki",
  SANARFLIX: "SanarFlix",
  YOUTUBE: "YouTube",
  PDF: "PDF",
  BOOK: "Livro",
  COURSE: "Curso",
  QUESTIONS: "Questões",
  CLASS: "Aula",
  FLASHCARDS: "Flashcards",
  OTHER: "Outro",
};

export default async function SourcesPage() {
  const user = await requireUser();
  const sources = await listAllSources(user.id);

  const bySubject = new Map<string, { name: string; color: string; sources: typeof sources }>();
  for (const source of sources) {
    const key = source.subject?.id ?? "none";
    const entry = bySubject.get(key);
    if (entry) {
      entry.sources.push(source);
    } else {
      bySubject.set(key, {
        name: source.subject?.name ?? "Sem matéria",
        color: source.subject?.color ?? "#6b6b6f",
        sources: [source],
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Fontes</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {sources.length} fonte{sources.length === 1 ? "" : "s"} cadastradas em todas as matérias
      </p>

      {sources.length === 0 ? (
        <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border py-16 text-center">
          <Library className="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            Nenhuma fonte ainda. Adicione fontes (SanarFlix, Anki, PDFs, aulas...) a partir da
            página de um tópico.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...bySubject.values()].map((group) => (
            <div key={group.name}>
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: group.color }} />
                {group.name}
              </div>
              <ul className="space-y-1">
                {group.sources.map((source) => (
                  <li
                    key={source.id}
                    className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground">
                      {typeLabel[source.type]}
                    </span>
                    <Link
                      href={source.topic ? `/topics/${source.topic.id}` : "#"}
                      className="min-w-0 flex-1 truncate text-foreground hover:text-accent hover:underline"
                    >
                      {source.title}
                      {source.topic && (
                        <span className="ml-1.5 text-xs text-muted-foreground">· {source.topic.name}</span>
                      )}
                    </Link>
                    {source.completed && (
                      <span className="shrink-0 text-xs text-success">Concluída</span>
                    )}
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-muted-foreground hover:text-accent"
                        aria-label={`Abrir ${source.title}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
