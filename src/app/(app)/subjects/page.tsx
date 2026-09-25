import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listSubjects } from "@/server/services/subjects";
import { QuickCreateSubject } from "./quick-create-subject";
import { SubjectAvatar } from "@/components/ui/subject-avatar";

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
        <div className="animate-fade-in-up mt-6 flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border py-16 text-center">
          <BookOpen className="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            Nenhuma matéria ainda. Crie a primeira acima para começar.
          </p>
        </div>
      ) : (
        <div className="stagger mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/subjects/${subject.id}`}
              className="group rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)] transition-[box-shadow,border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex items-start gap-3">
                <SubjectAvatar subject={subject} className="mt-0.5" />
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
