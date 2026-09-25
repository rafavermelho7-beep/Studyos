import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireUser } from "@/lib/auth/session";
import { getLesson } from "@/server/services/lessons";
import { SubjectMark } from "@/components/ui/subject-mark";
import { ConfirmDeleteButton } from "@/components/ui/delete-buttons";
import { deleteLessonAction } from "../actions";
import { LessonDetailsForm } from "./lesson-details-form";
import { LessonFiles } from "./lesson-files";
import { LessonLinks } from "./lesson-links";
import { LessonTopics } from "./lesson-topics";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const lesson = await getLesson(user.id, id);
  return { title: lesson ? `${lesson.title} · StudyOS` : "Aula · StudyOS" };
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lesson = await getLesson(user.id, id);
  if (!lesson) notFound();

  const files = lesson.attachments.filter((a) => a.kind === "FILE");
  const links = lesson.attachments.filter((a) => a.kind === "LINK");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <Link
        href={`/subjects/${lesson.subject.id}`}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        ← <SubjectMark color={lesson.subject.color} emoji={lesson.subject.emoji} /> {lesson.subject.name}
      </Link>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{lesson.title}</h1>
          {/* First letter only — CSS `capitalize` would give "25 De Setembro De". */}
          <p className="text-sm text-muted-foreground">
            {capitalizeFirst(format(lesson.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }))}
          </p>
        </div>
        <div className="max-w-sm flex-none">
          <ConfirmDeleteButton
            label="Excluir aula"
            question={`Excluir "${lesson.title}"?`}
            details={
              files.length > 0
                ? `Os ${files.length} arquivo${files.length === 1 ? "" : "s"} enviado${files.length === 1 ? "" : "s"} também são apagados. Não dá pra desfazer.`
                : "Não dá pra desfazer."
            }
            onDelete={deleteLessonAction.bind(null, lesson.id)}
          />
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Slides e arquivos</h2>
        <LessonFiles
          lessonId={lesson.id}
          files={files.map((f) => ({ id: f.id, name: f.name, contentType: f.contentType, byteSize: f.byteSize }))}
        />
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Links</h2>
        <LessonLinks lessonId={lesson.id} links={links.map((l) => ({ id: l.id, name: l.name, url: l.url }))} />
      </section>

      <section className="mt-6">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Tópicos desta aula</h2>
        <p className="mb-2 text-xs text-muted-foreground">
          Os materiais também aparecem na página de cada tópico marcado.
        </p>
        <LessonTopics
          lessonId={lesson.id}
          topics={lesson.subject.topics}
          selected={lesson.topics.map((t) => t.topicId)}
        />
      </section>

      <section className="mt-6 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <LessonDetailsForm
          lesson={{
            id: lesson.id,
            title: lesson.title,
            dateValue: format(lesson.date, "yyyy-MM-dd"),
            notes: lesson.notes,
          }}
        />
      </section>
    </div>
  );
}

function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
