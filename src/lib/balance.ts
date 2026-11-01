// Equilíbrio entre domínios (DEC-003). Definição provisória (PEN-05, DEC-T12):
// o próprio usuário avalia cada domínio de 0 a 10 semanalmente; o índice combina
// a média com a dispersão — equilíbrio alto exige notas altas E parecidas.

import { DOMAINS, type DomainKey } from "@/lib/domains";

export interface Rating {
  domain: string;
  score: number;
  week_start: string;
}

export interface BalanceSnapshot {
  week: string | null;
  scores: Partial<Record<DomainKey, number>>;
  rated: number;
  mean: number | null;
  spread: number | null;
  /** 0–100. null quando há menos de 5 domínios avaliados. */
  index: number | null;
  lowest: { domain: DomainKey; score: number }[];
}

export function balanceSnapshot(ratings: Rating[]): BalanceSnapshot {
  const week = ratings.reduce<string | null>((m, r) => (!m || r.week_start > m ? r.week_start : m), null);
  const scores: Partial<Record<DomainKey, number>> = {};
  for (const r of ratings) if (r.week_start === week) scores[r.domain as DomainKey] = r.score;
  const values = Object.values(scores) as number[];
  const rated = values.length;
  if (rated === 0) return { week, scores, rated, mean: null, spread: null, index: null, lowest: [] };
  const mean = values.reduce((a, b) => a + b, 0) / rated;
  const spread = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / rated);
  // Média (0–10) penalizada pelo desvio padrão; escala 0–100.
  const index = rated >= 5 ? Math.max(0, Math.min(100, Math.round((mean - spread * 0.8) * 10))) : null;
  const lowest = (Object.entries(scores) as [DomainKey, number][])
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([domain, score]) => ({ domain, score }));
  return { week, scores, rated, mean: Math.round(mean * 10) / 10, spread: Math.round(spread * 10) / 10, index, lowest };
}

export function unratedDomains(s: BalanceSnapshot): DomainKey[] {
  return DOMAINS.map((d) => d.key).filter((k) => s.scores[k] === undefined);
}
