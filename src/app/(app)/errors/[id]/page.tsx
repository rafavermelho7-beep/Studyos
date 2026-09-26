import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getError } from "@/server/services/errors";
import { listSubjects } from "@/server/services/subjects";
import { listTopicsForUser } from "@/server/services/topics";
import { updateErrorAction } from "../actions";
import { ErrorForm } from "../error-form";

export const metadata: Metadata = { title: "Editar erro · StudyOS" };

export default async function EditErrorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [entry, subjects, topics] = await Promise.all([
    getError(user.id, id),
    listSubjects(user.id),
    listTopicsForUser(user.id),
  ]);
  if (!entry) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <Link href="/errors" className="text-xs text-muted-foreground hover:text-foreground">
        ← Caderno de Erros
      </Link>
      <h1 className="mb-4 mt-1 text-xl font-semibold tracking-tight">Editar erro</h1>
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <ErrorForm
          subjects={subjects.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji }))}
          topics={topics.map((t) => ({ id: t.id, name: t.name, subjectId: t.subjectId }))}
          defaults={{
            subjectId: entry.subjectId,
            topicId: entry.topicId,
            source: entry.source,
            question: entry.question,
            reason: entry.reason,
            lesson: entry.lesson,
            hasPhoto: entry.imageId !== null,
          }}
          onSubmit={updateErrorAction.bind(null, entry.id)}
          submitLabel="Salvar alterações"
        />
      </div>
    </div>
  );
}
