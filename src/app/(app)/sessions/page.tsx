import type { Metadata } from "next";
import { Timer } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listSubjects } from "@/server/services/subjects";
import { listTopicsForUser } from "@/server/services/topics";
import { listRecentStudyEvents } from "@/server/services/study-events";
import { FocusSession } from "./focus-session";
import { RecentActivity } from "./recent-activity";

export const metadata: Metadata = { title: "Sessão de estudo · StudyOS" };

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string; topicId?: string }>;
}) {
  const { subjectId, topicId } = await searchParams;
  const user = await requireUser();
  const [subjects, topics, recentEvents] = await Promise.all([
    listSubjects(user.id),
    listTopicsForUser(user.id),
    listRecentStudyEvents(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Sessão de estudo</h1>

      <FocusSession
        subjects={subjects.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
        topics={topics.map((t) => ({ id: t.id, name: t.name, subjectId: t.subjectId }))}
        initialSubjectId={subjectId}
        initialTopicId={topicId}
      />

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Atividade recente</h2>
        {recentEvents.length === 0 ? (
          <div className="animate-fade-in-up flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border py-10 text-center">
            <Timer className="mb-2 h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">Nenhuma sessão registrada ainda.</p>
          </div>
        ) : (
          <RecentActivity events={recentEvents} />
        )}
      </div>
    </div>
  );
}
