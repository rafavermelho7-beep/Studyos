"use client";

import { useEffect, useState, useTransition } from "react";
import { Play, Pause, Square, RotateCcw } from "lucide-react";
import { logStudySessionAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Mode = "free" | "pomodoro";
type Phase = "setup" | "work" | "break" | "summary";

type SubjectOption = { id: string; name: string; color: string };
type TopicOption = { id: string; name: string; subjectId: string };

const presets = [
  { label: "25 / 5", work: 25, brk: 5 },
  { label: "50 / 10", work: 50, brk: 10 },
  { label: "90 / 15", work: 90, brk: 15 },
];

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  return `${m} minutos`;
}

export function FocusSession({
  subjects,
  topics,
}: {
  subjects: SubjectOption[];
  topics: TopicOption[];
}) {
  const [mode, setMode] = useState<Mode>("free");
  const [phase, setPhase] = useState<Phase>("setup");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [goal, setGoal] = useState("");
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);

  const [accumulatedWorkSec, setAccumulatedWorkSec] = useState(0);
  const [nowMs, setNowMs] = useState(0);
  const [segmentStart, setSegmentStart] = useState<number | null>(null);
  const [breakStart, setBreakStart] = useState<number | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null);
  const [paused, setPaused] = useState(false);
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<{ durationSec: number } | null>(null);

  // Tick once a second while a work/break clock is running, and (in
  // Pomodoro mode) flip phase when a boundary is crossed. Everything
  // impure/mutating lives inside the interval callback — an async context,
  // not the effect body itself — so render stays pure and no setState call
  // happens synchronously during the effect's own execution.
  useEffect(() => {
    if (phase !== "work" && phase !== "break") return;
    const id = setInterval(() => {
      const now = Date.now();
      setNowMs(now);

      if (mode !== "pomodoro") return;

      if (phase === "work" && !paused && segmentStart !== null) {
        const elapsed = accumulatedWorkSec + (now - segmentStart) / 1000;
        if (elapsed >= workMin * 60) {
          setAccumulatedWorkSec(elapsed);
          setSegmentStart(null);
          setBreakStart(now);
          setPhase("break");
        }
      } else if (phase === "break" && breakStart !== null) {
        const elapsed = (now - breakStart) / 1000;
        if (elapsed >= breakMin * 60) {
          setBreakStart(null);
          setSegmentStart(now);
          setPhase("work");
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase, mode, paused, segmentStart, breakStart, workMin, breakMin, accumulatedWorkSec]);

  const workElapsedSec =
    accumulatedWorkSec + (segmentStart !== null && !paused ? Math.max(0, nowMs - segmentStart) / 1000 : 0);
  const breakElapsedSec = breakStart !== null ? Math.max(0, nowMs - breakStart) / 1000 : 0;

  function start() {
    const now = Date.now();
    setSessionStartedAt(new Date(now));
    setSegmentStart(now);
    setNowMs(now);
    setAccumulatedWorkSec(0);
    setPaused(false);
    setPhase("work");
  }

  function togglePause() {
    if (phase === "break") return;
    if (paused) {
      setSegmentStart(Date.now());
      setPaused(false);
    } else {
      setAccumulatedWorkSec(workElapsedSec);
      setSegmentStart(null);
      setPaused(true);
    }
  }

  function finish() {
    const finalWorkSec = Math.round(workElapsedSec);
    setSegmentStart(null);
    setBreakStart(null);

    if (finalWorkSec < 1) {
      setPhase("setup");
      return;
    }

    const startedAt = sessionStartedAt ?? new Date();
    const endedAt = new Date();

    startTransition(async () => {
      const result = await logStudySessionAction({
        subjectId: subjectId || undefined,
        topicId: topicId || undefined,
        goal: goal || undefined,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationSec: finalWorkSec,
        activityType: mode === "pomodoro" ? "POMODORO" : "SESSION",
      });
      setSummary({ durationSec: result.durationSec });
      setPhase("summary");
    });
  }

  function resetAll() {
    setPhase("setup");
    setSummary(null);
    setAccumulatedWorkSec(0);
    setGoal("");
    setPaused(false);
  }

  const filteredTopics = topics.filter((t) => t.subjectId === subjectId);
  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const selectedTopic = topics.find((t) => t.id === topicId);

  if (phase === "summary" && summary) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-success">Sessão concluída</p>
        {selectedSubject && (
          <p className="mt-3 text-lg font-semibold text-foreground">{selectedSubject.name}</p>
        )}
        {selectedTopic && <p className="text-sm text-muted-foreground">{selectedTopic.name}</p>}
        <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          {formatDuration(summary.durationSec)}
        </p>
        <Button className="mt-6" onClick={resetAll}>
          <RotateCcw className="h-4 w-4" />
          Nova sessão
        </Button>
      </div>
    );
  }

  if (phase === "work" || phase === "break") {
    const isBreak = phase === "break";
    const display = isBreak
      ? mode === "pomodoro"
        ? breakMin * 60 - breakElapsedSec
        : breakElapsedSec
      : mode === "pomodoro"
        ? workMin * 60 - workElapsedSec
        : workElapsedSec;

    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8 text-center">
        <p
          className={cn(
            "text-xs font-medium uppercase tracking-wide",
            isBreak ? "text-warning" : "text-accent",
          )}
        >
          {isBreak ? "Pausa" : "Foco"}
        </p>
        {selectedSubject && !isBreak && (
          <p className="mt-2 text-sm font-medium text-foreground">
            {selectedSubject.name}
            {selectedTopic && ` · ${selectedTopic.name}`}
          </p>
        )}
        <p className="mt-4 font-mono text-6xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatClock(display)}
        </p>
        {paused && <p className="mt-2 text-sm text-muted-foreground">Pausado</p>}
        <div className="mt-6 flex justify-center gap-2">
          {!isBreak && (
            <Button variant="secondary" onClick={togglePause}>
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {paused ? "Retomar" : "Pausar"}
            </Button>
          )}
          <Button onClick={finish} disabled={pending}>
            <Square className="h-4 w-4" />
            {pending ? "Salvando..." : "Finalizar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
      <div className="mb-4 flex gap-1 rounded-[var(--radius-sm)] bg-surface-2 p-1">
        {(["free", "pomodoro"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-[var(--radius-sm)] py-1.5 text-sm font-medium transition-colors",
              mode === m ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {m === "free" ? "Livre" : "Pomodoro"}
          </button>
        ))}
      </div>

      {mode === "pomodoro" && (
        <div className="mb-4 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setWorkMin(p.work);
                setBreakMin(p.brk);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                workMin === p.work && breakMin === p.brk
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-muted-foreground hover:border-border-strong",
              )}
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Input
              type="number"
              min={1}
              max={180}
              value={workMin}
              onChange={(e) => setWorkMin(Number(e.target.value) || 1)}
              className="h-7 w-14 px-2"
              aria-label="Minutos de foco"
            />
            /
            <Input
              type="number"
              min={1}
              max={60}
              value={breakMin}
              onChange={(e) => setBreakMin(Number(e.target.value) || 1)}
              className="h-7 w-14 px-2"
              aria-label="Minutos de pausa"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          aria-label="Matéria da sessão"
          value={subjectId}
          onChange={(e) => {
            setSubjectId(e.target.value);
            setTopicId("");
          }}
          className="h-9 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-accent"
        >
          <option value="">Sem matéria específica</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Tópico da sessão"
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
          disabled={!subjectId}
          className="h-9 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-accent disabled:opacity-50"
        >
          <option value="">Sem tópico específico</option>
          {filteredTopics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <Input
        placeholder="Objetivo da sessão (opcional)"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        className="mt-2"
      />

      <Button className="mt-4 w-full" size="lg" onClick={start}>
        <Play className="h-4 w-4" />
        Começar sessão
      </Button>
    </div>
  );
}
