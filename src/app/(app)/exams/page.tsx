import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listExams } from "@/server/services/exams";
import { listSubjects } from "@/server/services/subjects";
import { QuickCreateExam } from "./quick-create-exam";
import { ExamCard } from "./exam-card";

export const metadata: Metadata = { title: "Provas · StudyOS" };

export default async function ExamsPage() {
  const user = await requireUser();
  const [exams, subjects] = await Promise.all([listExams(user.id), listSubjects(user.id)]);

  const upcoming = exams.filter((e) => new Date(e.date) >= new Date(new Date().setHours(0, 0, 0, 0)));
  const past = exams.filter((e) => new Date(e.date) < new Date(new Date().setHours(0, 0, 0, 0)));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Provas</h1>

      <QuickCreateExam subjects={subjects.map((s) => ({ id: s.id, name: s.name }))} />

      {exams.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border py-16 text-center">
          <CalendarClock className="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">Nenhuma prova cadastrada ainda.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mt-6 space-y-2">
              {upcoming.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Provas passadas</h2>
              <div className="space-y-2">
                {past.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
