"use client";
import { useState, useTransition } from "react";
import { updateGoal, updateProject } from "@/app/actions";
import { domainLabel } from "@/lib/domains";
import { Badge } from "@/components/ui";

interface Goal { id: string; title: string; why: string; domain: string | null; status: string; progress: number; target_date: string | null }
interface Project { id: string; title: string; status: string; next_action: string; due_date: string | null; domain: string | null }

export function GoalRow({ goal }: { goal: Goal }) {
  const [progress, setProgress] = useState(goal.progress);
  const [pending, start] = useTransition();
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] text-text">{goal.title}</span>
            {goal.status !== "active" && <Badge>{goal.status === "paused" ? "pausado" : goal.status}</Badge>}
          </div>
          {goal.why && <p className="mt-0.5 text-[13px] text-text-3">{goal.why}</p>}
          <div className="label mt-1">
            {domainLabel(goal.domain)}
            {goal.target_date ? ` · até ${goal.target_date.split("-").reverse().join("/")}` : ""}
          </div>
        </div>
        <span className="label w-10 shrink-0 text-right">{progress}%</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          onPointerUp={() => start(async () => void (await updateGoal({ id: goal.id, progress })))}
          onKeyUp={() => start(async () => void (await updateGoal({ id: goal.id, progress })))}
          className="range flex-1"
          aria-label={`Progresso de ${goal.title}`}
        />
        <select
          disabled={pending}
          value={goal.status}
          onChange={(e) => start(async () => void (await updateGoal({ id: goal.id, status: e.target.value as Goal["status"] as "active" })))}
          className="rounded-full border border-line bg-transparent px-2 py-1 text-[12px] text-text-3"
          aria-label="Status"
        >
          <option value="active">Ativo</option>
          <option value="paused">Pausado</option>
          <option value="done">Concluído</option>
          <option value="dropped">Abandonado</option>
        </select>
      </div>
    </li>
  );
}

export function ProjectRow({ project, goalTitle }: { project: Project; goalTitle?: string }) {
  const [pending, start] = useTransition();
  const [next, setNext] = useState(project.next_action);
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] text-text">{project.title}</div>
          <div className="label mt-1">
            {goalTitle ? `${goalTitle} · ` : ""}
            {domainLabel(project.domain)}
            {project.due_date ? ` · prazo ${project.due_date.split("-").reverse().join("/")}` : ""}
          </div>
        </div>
        <select
          disabled={pending}
          value={project.status}
          onChange={(e) => start(async () => void (await updateProject({ id: project.id, status: e.target.value as "active" })))}
          className="rounded-full border border-line bg-transparent px-2 py-1 text-[12px] text-text-3"
          aria-label="Status"
        >
          <option value="planned">Planejado</option>
          <option value="active">Ativo</option>
          <option value="paused">Pausado</option>
          <option value="done">Concluído</option>
          <option value="dropped">Abandonado</option>
        </select>
      </div>
      <input
        value={next}
        onChange={(e) => setNext(e.target.value)}
        onBlur={() => next !== project.next_action && start(async () => void (await updateProject({ id: project.id, next_action: next })))}
        placeholder="Próxima ação…"
        className="mt-2 w-full border-b border-transparent bg-transparent py-1 text-[13.5px] text-text-2 outline-none placeholder:text-text-3 focus:border-line-2"
      />
    </li>
  );
}
