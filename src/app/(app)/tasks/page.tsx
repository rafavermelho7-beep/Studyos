import type { Metadata } from "next";
import Link from "next/link";
import { ListTodo } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listTasks } from "@/server/services/tasks";
import { listSubjects } from "@/server/services/subjects";
import { QuickCreateTask } from "./quick-create-task";
import { TaskRow } from "./task-row";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Tarefas · StudyOS" };

const filters: { value: TaskStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "TODO", label: "A fazer" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "DONE", label: "Concluídas" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const user = await requireUser();

  const activeFilter =
    status && (["TODO", "IN_PROGRESS", "DONE"] as const).includes(status as TaskStatus)
      ? (status as TaskStatus)
      : undefined;

  const [tasks, subjects] = await Promise.all([
    listTasks(user.id, { status: activeFilter }),
    listSubjects(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Tarefas</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {tasks.length} tarefa{tasks.length === 1 ? "" : "s"}
      </p>

      <QuickCreateTask subjects={subjects.map((s) => ({ id: s.id, name: s.name }))} />

      <div className="mt-4 flex gap-1 border-b border-border">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={f.value === "ALL" ? "/tasks" : `/tasks?status=${f.value}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              (f.value === "ALL" && !activeFilter) || f.value === activeFilter
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border py-16 text-center">
          <ListTodo className="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">Nenhuma tarefa aqui.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </div>
  );
}
