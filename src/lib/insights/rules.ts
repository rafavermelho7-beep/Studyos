// Motor de regras determinísticas (custo zero de IA). Cada regra devolve avisos
// com evidência e tamanho de amostra (P-03: correlação é hipótese, com n explícito).

import { addDays, daysBetween } from "@/lib/dates";
import { domainLabel, type DomainKey } from "@/lib/domains";

export interface InsightDraft {
  kind: "problem" | "opportunity" | "pattern" | "conflict" | "attention";
  title: string;
  body: string;
  domain: DomainKey | null;
  evidence: Record<string, unknown>;
  confidence: number;
  dedupe_key: string;
}

export interface RulesInput {
  today: string;
  health: { day: string; sleep_minutes: number | null; workouts: number | null; workout_minutes: number | null }[];
  exams: { day: string; title: string }[];
  goals: { id: string; title: string; domain: string | null; status: string; target_date: string | null; horizon: string; updated_at: string }[];
  projects: { id: string; title: string; status: string; updated_at: string; next_action: string }[];
  ratings: { domain: string; week_start: string; score: number }[];
  checkins: { day: string; energy: number | null }[];
}

/** UC-02: avisar quando parar de treinar. */
export function ruleTrainingStopped(input: RulesInput): InsightDraft[] {
  const window = input.health.filter((h) => daysBetween(h.day, input.today) <= 60 && h.day <= input.today);
  if (window.length < 14) return []; // dados insuficientes
  const workoutDays = window
    .filter((h) => (h.workouts ?? 0) > 0 || (h.workout_minutes ?? 0) >= 15)
    .map((h) => h.day)
    .sort();
  if (workoutDays.length < 4) return []; // sem hábito estabelecido para comparar
  const gaps: number[] = [];
  for (let i = 1; i < workoutDays.length; i++) gaps.push(daysBetween(workoutDays[i - 1], workoutDays[i]));
  const sorted = [...gaps].sort((a, b) => a - b);
  const typical = sorted[Math.floor(sorted.length / 2)] || 1;
  const last = workoutDays[workoutDays.length - 1];
  const since = daysBetween(last, input.today);
  const threshold = Math.max(5, Math.ceil(typical * 2.5));
  if (since < threshold) return [];
  return [
    {
      kind: "attention",
      title: `${since} dias sem treinar`,
      body: `Seu intervalo típico entre treinos é de ${typical} dia(s); o último registro foi em ${last}. Pausa planejada ou o ritmo caiu sem você perceber?`,
      domain: "saude",
      evidence: { last_workout: last, days_since: since, typical_gap: typical, workouts_60d: workoutDays.length, n_days: window.length },
      confidence: Math.min(0.9, 0.5 + workoutDays.length / 40),
      dedupe_key: `training_stopped:${last}`,
    },
  ];
}

/** UC-01: sono em semanas de prova × semanas normais. */
export function ruleSleepExamWeeks(input: RulesInput): InsightDraft[] {
  const sleep = input.health.filter((h) => h.sleep_minutes !== null && h.sleep_minutes > 0);
  if (!input.exams.length || sleep.length < 14) return [];
  const examDays = new Set<string>();
  for (const e of input.exams) for (let i = 0; i <= 6; i++) examDays.add(addDays(e.day, -i)); // semana que antecede a prova
  const inExam = sleep.filter((s) => examDays.has(s.day)).map((s) => s.sleep_minutes!);
  const normal = sleep.filter((s) => !examDays.has(s.day)).map((s) => s.sleep_minutes!);
  if (inExam.length < 4 || normal.length < 7) return [];
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const diff = Math.round(avg(normal) - avg(inExam));
  if (Math.abs(diff) < 30) return [];
  const h = (m: number) => `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, "0")}`;
  const n = inExam.length + normal.length;
  return [
    {
      kind: "pattern",
      title: diff > 0 ? `Você dorme ~${diff} min a menos em semanas de prova` : `Você dorme ~${-diff} min a mais em semanas de prova`,
      body: `Média em semanas de prova: ${h(avg(inExam))} (${inExam.length} noites) · demais: ${h(avg(normal))} (${normal.length} noites). Hipótese baseada em ${n} noites — não é causa comprovada.`,
      domain: "saude",
      evidence: { exam_nights: inExam.length, normal_nights: normal.length, diff_minutes: diff },
      confidence: Math.min(0.85, 0.35 + n / 120),
      dedupe_key: `sleep_exam:${input.today.slice(0, 7)}`,
    },
  ];
}

/** Conflitos entre objetivos: sobrecarga e prazos concorrentes. */
export function ruleGoalConflicts(input: RulesInput): InsightDraft[] {
  const active = input.goals.filter((g) => g.status === "active");
  const out: InsightDraft[] = [];
  if (active.length > 6) {
    out.push({
      kind: "conflict",
      title: `${active.length} objetivos ativos ao mesmo tempo`,
      body: "Ambição alta é uma diretriz, mas muitos objetivos simultâneos diluem atenção. Vale pausar algum ou definir qual é prioridade neste trimestre?",
      domain: null,
      evidence: { active: active.length },
      confidence: 0.7,
      dedupe_key: `goal_overload:${active.length}`,
    });
  }
  const withDates = active.filter((g) => g.target_date).sort((a, b) => a.target_date!.localeCompare(b.target_date!));
  for (let i = 1; i < withDates.length; i++) {
    const a = withDates[i - 1];
    const b = withDates[i];
    if (daysBetween(a.target_date!, b.target_date!) <= 14 && a.domain !== b.domain && daysBetween(input.today, a.target_date!) >= 0) {
      out.push({
        kind: "conflict",
        title: `Prazos próximos: "${a.title}" e "${b.title}"`,
        body: `Dois objetivos de domínios diferentes vencem com menos de 15 dias de diferença (${a.target_date} e ${b.target_date}). Há capacidade para os dois?`,
        domain: null,
        evidence: { goals: [a.id, b.id] },
        confidence: 0.6,
        dedupe_key: `deadline_clash:${a.id}:${b.id}`,
      });
    }
  }
  for (const g of active) {
    if (!g.target_date) continue;
    const examClash = input.exams.find((e) => Math.abs(daysBetween(e.day, g.target_date!)) <= 3);
    if (examClash && g.domain !== "estudos") {
      out.push({
        kind: "conflict",
        title: `"${g.title}" vence perto de uma prova`,
        body: `O prazo (${g.target_date}) cai a menos de 3 dias de "${examClash.title}" (${examClash.day}).`,
        domain: g.domain as DomainKey | null,
        evidence: { goal: g.id, exam_day: examClash.day },
        confidence: 0.65,
        dedupe_key: `goal_exam:${g.id}:${examClash.day}`,
      });
    }
  }
  return out;
}

/** Projetos parados há 21+ dias. */
export function ruleStalledProjects(input: RulesInput): InsightDraft[] {
  return input.projects
    .filter((p) => p.status === "active" && daysBetween(p.updated_at.slice(0, 10), input.today) >= 21)
    .slice(0, 3)
    .map((p) => {
      const days = daysBetween(p.updated_at.slice(0, 10), input.today);
      return {
        kind: "problem" as const,
        title: `Projeto parado: ${p.title}`,
        body: `Sem atualização há ${days} dias.${p.next_action ? ` Próxima ação registrada: "${p.next_action}".` : " Nenhuma próxima ação definida."} Continuar, pausar ou encerrar?`,
        domain: null,
        evidence: { project: p.id, days },
        confidence: 0.7,
        dedupe_key: `stalled:${p.id}:${p.updated_at.slice(0, 10)}`,
      };
    });
}

/** Equilíbrio: domínio com nota baixa ou objetivo em domínio negligenciado. */
export function ruleBalance(input: RulesInput): InsightDraft[] {
  const latestWeek = input.ratings.reduce<string | null>((m, r) => (!m || r.week_start > m ? r.week_start : m), null);
  if (!latestWeek || daysBetween(latestWeek, input.today) > 14) return [];
  return input.ratings
    .filter((r) => r.week_start === latestWeek && r.score <= 3)
    .slice(0, 2)
    .map((r) => ({
      kind: "attention" as const,
      title: `${domainLabel(r.domain)} em ${r.score}/10`,
      body: `Na sua última autoavaliação, ${domainLabel(r.domain).toLowerCase()} ficou entre os mais baixos. Vale abrir um espaço para entender o que está travando?`,
      domain: r.domain as DomainKey,
      evidence: { week: latestWeek, score: r.score },
      confidence: 0.75,
      dedupe_key: `balance_low:${r.domain}:${latestWeek}`,
    }));
}

export function runRules(input: RulesInput): InsightDraft[] {
  return [
    ...ruleTrainingStopped(input),
    ...ruleSleepExamWeeks(input),
    ...ruleGoalConflicts(input),
    ...ruleStalledProjects(input),
    ...ruleBalance(input),
  ];
}
