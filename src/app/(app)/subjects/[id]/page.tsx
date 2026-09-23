import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getSubject, getSubjectDeletionImpact } from "@/server/services/subjects";
import { SubjectEditForm } from "./subject-edit-form";
import { TopicTree } from "./topic-tree";
import { AddTopicForm } from "./add-topic-form";
import { ConfirmDeleteButton } from "@/components/ui/delete-buttons";
import { subjectDeletionDetails } from "@/lib/deletion-copy";
import { deleteSubjectAction } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const subject = await getSubject(user.id, id);
  return { title: subject ? `${subject.name} · StudyOS` : "Matéria · StudyOS" };
}

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const subject = await getSubject(user.id, id);
  if (!subject) notFound();
  const impact = await getSubjectDeletionImpact(user.id, subject.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: subject.color }}
          />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{subject.name}</h1>
            <p className="text-sm text-muted-foreground">
              {subject.topics.length} tópico{subject.topics.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="max-w-sm flex-none">
          <ConfirmDeleteButton
            label="Excluir matéria"
            question={`Excluir "${subject.name}"?`}
            details={subjectDeletionDetails(impact)}
            onDelete={deleteSubjectAction.bind(null, subject.id)}
          />
        </div>
      </div>

      <SubjectEditForm subject={subject} />

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Tópicos</h2>
        <AddTopicForm subjectId={subject.id} />
        <div className="mt-3">
          <TopicTree subjectId={subject.id} topics={subject.topics} />
        </div>
      </div>
    </div>
  );
}
