import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listSubjects } from "@/server/services/subjects";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Início · StudyOS" };

function greeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

const statusMeta = {
  NOVO: { icon: "⚪", label: "não estudados" },
  APRENDENDO: { icon: "🟡", label: "aprendendo" },
  REVISANDO: { icon: "🟡", label: "revisando" },
  DOMINADO: { icon: "🟢", label: "dominados" },
} as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const subjects = await listSubjects(user.id);
  const firstName = (user.name ?? "").split(" ")[0] || undefined;
  const hour = new Date().getHours();

  const totalTopics = subjects.reduce((sum, s) => sum + s._count.topics, 0);

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

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {subjects.map((subject) => (
          <Link key={subject.id} href={`/subjects/${subject.id}`}>
            <Card className="transition-colors hover:border-border-strong">
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

      <p className="mt-8 text-xs text-muted-foreground">
        À medida que você registrar tarefas, provas e sessões de estudo, este painel vai
        mostrar recomendações de foco baseadas nos seus dados reais.
      </p>
    </div>
  );
}
