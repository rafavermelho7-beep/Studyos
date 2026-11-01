// Finanças leves (problema declarado: "dinheiro sem controle"). Sem acesso a banco (DEC-024):
// registro manual rápido + meta mensal + ritmo de gasto. Lógica pura.
import { daysInMonth } from "@/lib/dates";

export const EXPENSE_CATEGORIES = {
  alimentacao: "Alimentação",
  transporte: "Transporte",
  moradia: "Moradia",
  lazer: "Lazer",
  compras: "Compras",
  saude: "Saúde",
  educacao: "Educação",
  assinaturas: "Assinaturas",
  outros: "Outros",
} as const;
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

export interface MonthSnapshot {
  spent: number;
  budget: number | null;
  dayOfMonth: number;
  projected: number;
  byCategory: { category: ExpenseCategory; amount: number }[];
  status: "sem_meta" | "ok" | "atencao" | "estourado";
}

export function monthSnapshot(expenses: { day: string; amount: number; category: string }[], today: string, budget: number | null): MonthSnapshot {
  const month = today.slice(0, 7);
  const inMonth = expenses.filter((e) => e.day.startsWith(month) && e.day <= today);
  const spent = Math.round(inMonth.reduce((a, e) => a + Number(e.amount), 0) * 100) / 100;
  const dayOfMonth = Number(today.slice(8, 10));
  const projected = Math.round(((spent / dayOfMonth) * daysInMonth(today)) * 100) / 100;
  const cat = new Map<string, number>();
  for (const e of inMonth) cat.set(e.category, (cat.get(e.category) ?? 0) + Number(e.amount));
  const byCategory = [...cat]
    .map(([category, amount]) => ({ category: category as ExpenseCategory, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);
  let status: MonthSnapshot["status"] = "sem_meta";
  if (budget && budget > 0) {
    if (spent > budget) status = "estourado";
    else if (dayOfMonth >= 5 && projected > budget * 1.1) status = "atencao";
    else status = "ok";
  }
  return { spent, budget, dayOfMonth, projected, byCategory, status };
}

export function brl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function financeBudget(settings: unknown): number | null {
  const f = settings && typeof settings === "object" ? (settings as Record<string, { monthly_budget?: unknown }>).finance : null;
  const v = Number(f?.monthly_budget);
  return Number.isFinite(v) && v > 0 ? v : null;
}
