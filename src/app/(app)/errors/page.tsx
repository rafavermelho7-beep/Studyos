import type { Metadata } from "next";
import Link from "next/link";
import { Play } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { countDueErrors, errorSummary, listErrors, type ErrorFilters } from "@/server/services/errors";
import { listSubjects } from "@/server/services/subjects";
import { listTopicsForUser } from "@/server/services/topics";
import { ERROR_REASONS, ERROR_REASON_KEYS, type ErrorReason } from "@/lib/error-review";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createErrorAction } from "./actions";
import { ErrorForm } from "./error-form";
import { ErrorCard } from "./error-card";
import { AddErrorPanel } from "./add-error-panel";

export const metadata: Metadata = { title: "Caderno de Erros · StudyOS" };

type Search = { materia?: string; motivo?: string; status?: string };

function filterHref(current: Search, change: Partial<Search>) {
  const next = { ...current, ...change };
  const params = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
  const query = params.toString();
  return query ? `/errors?${query}` : "/errors";
}

export default async function ErrorsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const user = await requireUser();
  const filters: ErrorFilters = {
    subjectId: search.materia || undefined,
    reason: ERROR_REASON_KEYS.includes(search.motivo as ErrorReason) ? (search.motivo as ErrorReason) : undefined,
    status: search.status === "dominados" ? "mastered" : search.status === "todos" ? "all" : "active",
  };
  const [entries, summary, due, subjects, topics] = await Promise.all([
    listErrors(user.id, filters),
    errorSummary(user.id),
    countDueErrors(user.id),
    listSubjects(user.id),
    listTopicsForUser(user.id),
  ]);
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const topReason = summary.byReason[0];
  const topSubject = summary.bySubject.find((s) => s.subjectId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Caderno de Erros</h1>
          <p className="text-sm text-muted-foreground">Os conceitos que você errou nas questões, para não errar de novo.</p>
        </div>
        {due > 0 && (
          <Link href="/errors/review" className={buttonVariants({ size: "sm" })}>
            <Play className="h-3.5 w-3.5" />
            Revisar erros ({due})
          </Link>
        )}
      </div>

      {summary.total > 0 && (
        <div className="stagger mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-3">
            <p className="text-xs text-muted-foreground">Conceitos anotados</p>
            <p className="text-2xl font-bold text-foreground">{summary.total}</p>
            <p className="text-xs text-muted-foreground">{summary.mastered} dominados</p>
          </div>
          {topReason && (
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-3">
              <p className="text-xs text-muted-foreground">Principal motivo</p>
              <p className="text-2xl font-bold text-foreground">{Math.round((topReason.count / summary.withReason) * 100)}%</p>
              <p className="text-xs text-muted-foreground">{ERROR_REASONS[topReason.reason as ErrorReason]?.label}</p>
            </div>
          )}
          {topSubject?.subjectId && subjectById.get(topSubject.subjectId) && (
            <div className="col-span-2 rounded-[var(--radius-lg)] border border-border bg-surface p-3 sm:col-span-1">
              <p className="text-xs text-muted-foreground">Onde mais erra</p>
              <p className="truncate text-lg font-bold text-foreground">
                {subjectById.get(topSubject.subjectId)!.emoji} {subjectById.get(topSubject.subjectId)!.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {topSubject.count} erro{topSubject.count === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>
      )}

      <AddErrorPanel initiallyOpen={summary.total === 0}>
        <ErrorForm
          subjects={subjects.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji }))}
          topics={topics.map((t) => ({ id: t.id, name: t.name, subjectId: t.subjectId }))}
          onSubmit={createErrorAction}
          submitLabel="Salvar conceito"
        />
      </AddErrorPanel>

      {summary.total > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex gap-1 overflow-x-auto text-xs">
            {[
              { key: "", label: "Para revisar" },
              { key: "dominados", label: "Dominados" },
              { key: "todos", label: "Todos" },
            ].map((tab) => (
              <Link
                key={tab.key}
                href={filterHref(search, { status: tab.key })}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 font-medium",
                  (search.status ?? "") === tab.key ? "bg-accent-soft text-accent" : "text-muted-foreground hover:bg-surface-2",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-1 overflow-x-auto text-xs">
            <Link
              href={filterHref(search, { motivo: "" })}
              className={cn("shrink-0 rounded-full border px-3 py-1", !search.motivo ? "border-accent text-accent" : "border-border text-muted-foreground")}
            >
              Todos os motivos
            </Link>
            {ERROR_REASON_KEYS.map((key) => (
              <Link
                key={key}
                href={filterHref(search, { motivo: key })}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1",
                  search.motivo === key ? "border-accent text-accent" : "border-border text-muted-foreground",
                )}
              >
                {ERROR_REASONS[key].short}
              </Link>
            ))}
          </div>
          {subjects.length > 0 && (
            <div className="flex gap-1 overflow-x-auto text-xs">
              <Link
                href={filterHref(search, { materia: "" })}
                className={cn("shrink-0 rounded-full border px-3 py-1", !search.materia ? "border-accent text-accent" : "border-border text-muted-foreground")}
              >
                Todas as matérias
              </Link>
              {subjects.map((s) => (
                <Link
                  key={s.id}
                  href={filterHref(search, { materia: s.id })}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1",
                    search.materia === s.id ? "border-accent text-accent" : "border-border text-muted-foreground",
                  )}
                >
                  {s.emoji} {s.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <ul className="stagger mt-4 space-y-3">
        {entries.map((entry) => (
          <ErrorCard key={entry.id} entry={entry} />
        ))}
      </ul>
      {summary.total > 0 && entries.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">Nenhum erro com esses filtros.</p>
      )}
    </div>
  );
}
