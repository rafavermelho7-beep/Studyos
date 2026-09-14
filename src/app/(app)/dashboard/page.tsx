import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listSubjects } from "@/server/services/subjects";
import { listTasks } from "@/server/services/tasks";
import { getTodayStudySeconds } from "@/server/services/study-events";
import { countDueReviews } from "@/server/services/reviews";
import { getFocusRecommendations, getNeglectedSubjects } from "@/server/services/planning";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { FocusCard } from "./focus-card";
import { NeglectedSubjects } from "./neglected-subjects";

export const metadata: Metadata = { title: "Início · StudyOS" };

function greeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatStudySeconds(sec: number) {
  if (sec < 60) return "0 min";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [subjects, tasks, todaySeconds, dueReviews, recommendations, neglected] = await Promise.all([
    listSubjects(user.id),
    listTasks(user.id),
    getTodayStudySeconds(user.id),
    countDueReviews(user.id),
    getFocusRecommendations(user.id, 5),
    getNeglectedSubjects(user.id),
  ]);
  const firstName = (user.name ?? "").split(" ")[0] || undefined;
  const hour = new Date().getHours();

  const totalTopics = subjects.reduce((sum, s) => sum + s._count.topics, 0);
  const pendingTasks = tasks.filter((t) => t.status !== "DONE").length;
  const overdueTasks = tasks.filter((t) => t.overdue).length;

  if (subjects.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center md:px-6">
        <Sparkles className="mb-4 h-8 w-8 text-accent" strokeWidth={1.5} />
        <h1 className="text-xl font-semibold tracking-tight">
          {greeting(hour)}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vamos configurar seus estudos. Crie sua primeira matéria para o StudyOS
          começar a te ajudar a decidir o que estudar.
        </p>
        <Link href="/subjects" className={buttonVariants({ className: "mt-6" })}>
          Adicionar matéria
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <h1 className="text-xl font-semibold tracking-tight">
        {greeting(hour)}{firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {subjects.length} matéria{subjects.length === 1 ? "" : "s"} · {totalTopics} tópico
        {totalTopics === 1 ? "" : "s"} cadastrados
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Hoje</p>
            <p className="mt-0.5 text-lg font-semibold text-foreground">
              {formatStudySeconds(todaySeconds)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Tarefas pendentes</p>
            <p className="mt-0.5 text-lg font-semibold text-foreground">{pendingTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Atrasadas</p>
            <p
              className={`mt-0.5 text-lg font-semibold ${overdueTasks > 0 ? "text-danger" : "text-foreground"}`}
            >
              {overdueTasks}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Revisões</p>
            <p
              className={`mt-0.5 text-lg font-semibold ${dueReviews > 0 ? "text-accent" : "text-foreground"}`}
            >
              {dueReviews}
            </p>
          </CardContent>
        </Card>
      </div>

      {recommendations.length > 0 && (
        <div className="mt-6">
          <FocusCard top={recommendations[0]} rest={recommendations.slice(1)} />
        </div>
      )}

      <NeglectedSubjects subjects={neglected} />

      <h2 className="mb-2 mt-8 text-sm font-semibold text-foreground">Matérias</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {subjects.map((subject) => (
          <Link key={subject.id} href={`/subjects/${subject.id}`}>
            <Card className="hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]">
              <CardContent className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{subject.name}</p>
                  <p className="text-xs text-muted-foreground">{subject._count.topics} tópicos</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {recommendations.length === 0 && (
        <p className="mt-8 text-xs text-muted-foreground">
          À medida que você cadastrar tópicos, provas e revisões, este painel vai mostrar
          recomendações de foco baseadas nos seus dados reais.
        </p>
      )}
    </div>
  );
}
