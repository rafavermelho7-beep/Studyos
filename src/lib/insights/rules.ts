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
  studySessions?: { day: string; subject: string; minutes: number }[];
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const r1 = (n: number) => Math.round(n * 10) / 10;

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

/**
 * UC-03: energia × o que está estudando. Compara a energia (check-in 1–5) em dias com
 * cada disciplina vs. demais dias; e dias de carga alta (≥180 min) vs. leves. Também
 * energia após noites curtas (<6h) vs. noites ≥7h. Exige n mínimo e diferença ≥0,7.
 */
export function ruleEnergyStudy(input: RulesInput): InsightDraft[] {
  const energy = new Map<string, number>();
  for (const c of input.checkins) if (c.energy != null && daysBetween(c.day, input.today) <= 60) energy.set(c.day, c.energy);
  if (energy.size < 8) return [];
  const out: InsightDraft[] = [];
  const month = input.today.slice(0, 7);
  const sessions = (input.studySessions ?? []).filter((s) => daysBetween(s.day, input.today) <= 60);

  // Por disciplina
  const bySubject = new Map<string, Set<string>>();
  for (const s of sessions) {
    const key = s.subject.trim().toLowerCase();
    if (!bySubject.has(key)) bySubject.set(key, new Set());
    bySubject.get(key)!.add(s.day);
  }
  const candidates: { subject: string; diff: number; nIn: number; nOut: number; inAvg: number; outAvg: number }[] = [];
  for (const [subject, days] of bySubject) {
    const inE = [...energy].filter(([d]) => days.has(d)).map(([, e]) => e);
    const outE = [...energy].filter(([d]) => !days.has(d)).map(([, e]) => e);
    if (inE.length < 4 || outE.length < 4) continue;
    const diff = mean(inE) - mean(outE);
    if (Math.abs(diff) >= 0.7) candidates.push({ subject, diff, nIn: inE.length, nOut: outE.length, inAvg: mean(inE), outAvg: mean(outE) });
  }
  candidates.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  for (const c of candidates.slice(0, 2)) {
    const label = sessions.find((s) => s.subject.trim().toLowerCase() === c.subject)?.subject ?? c.subject;
    out.push({
      kind: "pattern",
      title: c.diff < 0 ? `Energia mais baixa em dias de ${label}` : `Energia mais alta em dias de ${label}`,
      body: `Energia média ${r1(c.inAvg)} em dias com ${label} (${c.nIn} dias) vs. ${r1(c.outAvg)} nos demais (${c.nOut}). Hipótese — pode ser o horário, a carga ou outra coisa que acontece nesses dias.`,
      domain: "estudos",
      evidence: { subject: label, n_in: c.nIn, n_out: c.nOut, diff: r1(c.diff) },
      confidence: Math.min(0.8, 0.3 + (c.nIn + c.nOut) / 60),
      dedupe_key: `energy_subject:${c.subject}:${month}`,
    });
  }

  // Carga de estudo
  const load = new Map<string, number>();
  for (const s of sessions) load.set(s.day, (load.get(s.day) ?? 0) + s.minutes);
  const heavy = [...energy].filter(([d]) => (load.get(d) ?? 0) >= 180).map(([, e]) => e);
  const light = [...energy].filter(([d]) => (load.get(d) ?? 0) > 0 && (load.get(d) ?? 0) < 90).map(([, e]) => e);
  if (heavy.length >= 4 && light.length >= 4 && Math.abs(mean(heavy) - mean(light)) >= 0.7) {
    const d = mean(heavy) - mean(light);
    out.push({
      kind: "pattern",
      title: d < 0 ? "Dias de estudo pesado coincidem com energia baixa" : "Energia mais alta em dias de estudo intenso",
      body: `Energia ${r1(mean(heavy))} em dias com ≥3h de estudo (${heavy.length} dias) vs. ${r1(mean(light))} em dias com <1h30 (${light.length}). Hipótese, não causa.`,
      domain: "estudos",
      evidence: { heavy: heavy.length, light: light.length, diff: r1(d) },
      confidence: Math.min(0.75, 0.3 + (heavy.length + light.length) / 60),
      dedupe_key: `energy_load:${month}`,
    });
  }

  // Sono da noite anterior (registrado no dia) × energia
  const sleep = new Map(input.health.filter((h) => h.sleep_minutes).map((h) => [h.day, h.sleep_minutes!]));
  const short = [...energy].filter(([d]) => (sleep.get(d) ?? 999) < 360).map(([, e]) => e);
  const good = [...energy].filter(([d]) => (sleep.get(d) ?? 0) >= 420).map(([, e]) => e);
  if (short.length >= 4 && good.length >= 4 && mean(good) - mean(short) >= 0.7) {
    out.push({
      kind: "pattern",
      title: "Noites curtas, energia menor no dia seguinte",
      body: `Energia ${r1(mean(short))} após noites <6h (${short.length}) vs. ${r1(mean(good))} após ≥7h (${good.length}). Hipótese baseada em ${short.length + good.length} dias.`,
      domain: "saude",
      evidence: { short: short.length, good: good.length },
      confidence: Math.min(0.8, 0.35 + (short.length + good.length) / 60),
      dedupe_key: `energy_sleep:${month}`,
    });
  }
  return out;
}

export function runRules(input: RulesInput): InsightDraft[] {
  return [
    ...ruleEnergyStudy(input),
    ...ruleTrainingStopped(input),
    ...ruleSleepExamWeeks(input),
    ...ruleGoalConflicts(input),
    ...ruleStalledProjects(input),
    ...ruleBalance(input),
  ];
}
