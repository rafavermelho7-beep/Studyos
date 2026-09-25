import type { Metadata } from "next";
import { Presentation } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { lessonStorageUsage, listRecentLessons } from "@/server/services/lessons";
import { listSubjects } from "@/server/services/subjects";
import { LESSON_FILES_QUOTA_BYTES } from "@/server/storage/types";
import { formatBytes } from "@/lib/format-bytes";
import { NewLessonForm } from "./new-lesson-form";
import { LessonList } from "./lesson-list";

export const metadata: Metadata = { title: "Aulas · StudyOS" };

export default async function LessonsPage() {
  const user = await requireUser();
  const [lessons, subjects, usedBytes] = await Promise.all([
    listRecentLessons(user.id, 200),
    listSubjects(user.id),
    lessonStorageUsage(user.id),
  ]);
  const usedPercent = Math.min(100, (usedBytes / LESSON_FILES_QUOTA_BYTES) * 100);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="text-xl font-semibold tracking-tight">Aulas</h1>
      <p className="mb-4 text-sm text-muted-foreground">O que foi dado em cada aula, com os slides e links.</p>

      {subjects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Crie uma matéria primeiro para registrar aulas.</p>
      ) : (
        <NewLessonForm subjects={subjects.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji }))} />
      )}

      <div className="mt-6">
        {lessons.length === 0 ? (
          <div className="animate-fade-in-up flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border py-12 text-center">
            <Presentation className="mb-2 h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">Nenhuma aula registrada ainda.</p>
          </div>
        ) : (
          <LessonList lessons={lessons} />
        )}
      </div>

      {usedBytes > 0 && (
        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Espaço de arquivos</span>
            <span>
              {formatBytes(usedBytes)} de {formatBytes(LESSON_FILES_QUOTA_BYTES)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full ${usedPercent > 90 ? "bg-danger" : "bg-accent"}`}
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
