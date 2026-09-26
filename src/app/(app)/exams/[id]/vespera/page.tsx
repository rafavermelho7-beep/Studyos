import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { requireUser } from "@/lib/auth/session";
import { getVespera } from "@/server/services/vespera";
import { SubjectMark } from "@/components/ui/subject-mark";
import { VesperaPlan } from "./vespera-plan";

export const metadata: Metadata = { title: "Modo véspera · StudyOS" };

export default async function VesperaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const data = await getVespera(user.id, id);
  if (!data) notFound();
  const { exam, topics } = data;
  const days = differenceInCalendarDays(exam.date, new Date());

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <Link href={`/exams/${exam.id}`} className="text-xs text-muted-foreground hover:text-foreground">
        ← {exam.name}
      </Link>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Modo véspera</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <SubjectMark color={exam.subject.color} emoji={exam.subject.emoji} />
            {exam.subject.name} · {exam.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold leading-none text-foreground">{days < 0 ? "—" : days === 0 ? "Hoje" : days}</p>
          {days > 0 && <p className="text-xs text-muted-foreground">dia{days === 1 ? "" : "s"} para a prova</p>}
        </div>
      </div>

      <div className="mt-5">
        {topics.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Esta prova ainda não tem tópicos.{" "}
            <Link href={`/exams/${exam.id}`} className="font-medium text-accent hover:underline">
              Marque o que cai na prova
            </Link>{" "}
            para montar o plano da véspera.
          </div>
        ) : (
          <VesperaPlan
            examId={exam.id}
            subjectId={exam.subject.id}
            // Closer exam, less time: a sensible starting point the user edits.
            defaultHours={days <= 1 ? 3 : 4}
            topics={topics.map((t) => ({
              ...t,
              retentionPercent: t.retention === null ? null : Math.round(t.retention * 100),
            }))}
          />
        )}
      </div>
    </div>
  );
}
