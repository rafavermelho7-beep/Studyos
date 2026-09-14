import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listSubjects } from "@/server/services/subjects";
import { QuickCreateSubject } from "./quick-create-subject";

export const metadata: Metadata = { title: "Matérias · StudyOS" };

export default async function SubjectsPage() {
  const user = await requireUser();
  const subjects = await listSubjects(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Matérias</h1>
          <p className="text-sm text-muted-foreground">
            {subjects.length === 0
              ? "Vamos configurar seus estudos."
              : `${subjects.length} matéria${subjects.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <QuickCreateSubject />

      {subjects.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border py-16 text-center">
          <BookOpen className="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            Nenhuma matéria ainda. Crie a primeira acima para começar.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/subjects/${subject.id}`}
              className="group rounded-[var(--radius-lg)] border border-border bg-surface p-4 transition-colors hover:border-border-strong"
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{subject.name}</p>
                  {subject.description && (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {subject.description}
                    </p>
                  )}
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    <span>{subject._count.topics} tópicos</span>
                    <span>{subject._count.tasks} tarefas</span>
                    <span>{subject._count.exams} provas</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
