// Controle de orçamento de IA (DEC-029: teto de R$50/mês só para APIs de IA).
// Lógica pura: recebe gastos agregados e decide o modo de operação.

import { daysInMonth } from "@/lib/dates";

export type BudgetMode = "normal" | "economy" | "critical" | "blocked";

export interface BudgetInput {
  capBRL: number;
  spentMonthBRL: number;
  spentTodayBRL: number;
  /** Data local YYYY-MM-DD (para calcular o teto diário). */
  today: string;
}

export interface BudgetState {
  mode: BudgetMode;
  capBRL: number;
  spentMonthBRL: number;
  spentTodayBRL: number;
  remainingBRL: number;
  usedRatio: number;
  dailyCapBRL: number;
  dailyCapReached: boolean;
  message: string;
}

export const BUDGET_THRESHOLDS = { economy: 0.7, critical: 0.9 } as const;

/** Teto diário: 3× a média diária, para permitir picos sem drenar o mês em um dia. */
export function dailyCap(capBRL: number, today: string): number {
  return Math.round(((capBRL / daysInMonth(today)) * 3) * 100) / 100;
}

export function computeBudget(input: BudgetInput): BudgetState {
  const cap = Math.max(0, input.capBRL);
  const spent = Math.max(0, input.spentMonthBRL);
  const spentToday = Math.max(0, input.spentTodayBRL);
  const ratio = cap === 0 ? 1 : spent / cap;
  const dCap = dailyCap(cap, input.today);
  const dailyReached = spentToday >= dCap;

  let mode: BudgetMode;
  if (ratio >= 1) mode = "blocked";
  else if (ratio >= BUDGET_THRESHOLDS.critical || dailyReached) mode = "critical";
  else if (ratio >= BUDGET_THRESHOLDS.economy) mode = "economy";
  else mode = "normal";

  const messages: Record<BudgetMode, string> = {
    normal: "Orçamento saudável.",
    economy: "Modo economia: modelos profundos desativados até o próximo mês.",
    critical: dailyReached && ratio < BUDGET_THRESHOLDS.critical
      ? "Teto diário atingido: apenas modelos leves até amanhã."
      : "Orçamento crítico: apenas modelos leves e tarefas essenciais.",
    blocked: "Teto mensal atingido: IA pausada. Funções locais continuam ativas.",
  };

  return {
    mode,
    capBRL: cap,
    spentMonthBRL: round2(spent),
    spentTodayBRL: round2(spentToday),
    remainingBRL: round2(Math.max(0, cap - spent)),
    usedRatio: Math.min(1, Math.round(ratio * 1000) / 1000),
    dailyCapBRL: dCap,
    dailyCapReached: dailyReached,
    message: messages[mode],
  };
}

/** Uma chamada só é permitida se o pior caso estimado couber no restante. */
export function canAfford(state: BudgetState, worstCaseBRL: number): boolean {
  if (state.mode === "blocked") return false;
  return worstCaseBRL <= state.remainingBRL;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function parseCap(raw: string | undefined = process.env.AI_MONTHLY_BUDGET_BRL): number {
  const v = Number(raw);
  // Teto rígido: nunca acima de R$50 sem alteração de código (limite autorizado pelo usuário).
  if (!Number.isFinite(v) || v <= 0) return 50;
  return Math.min(v, 50);
}
