import { addDays } from "date-fns";

// Caderno de Erros: why a question was missed, and when to see it again.
// Pure (no DB) so the schedule is unit-tested directly.

export const ERROR_REASONS = {
  NAO_SABIA: { label: "Não sabia o conteúdo", short: "Conteúdo" },
  CONFUNDI: { label: "Confundi conceitos", short: "Confusão" },
  ATENCAO: { label: "Falta de atenção", short: "Atenção" },
  INTERPRETACAO: { label: "Interpretei errado", short: "Interpretação" },
  CHUTE: { label: "Chutei", short: "Chute" },
} as const;
export type ErrorReason = keyof typeof ERROR_REASONS;
export const ERROR_REASON_KEYS = Object.keys(ERROR_REASONS) as ErrorReason[];

// Days until the next look, per stage. Getting it right moves one stage
// out; after the last one the error counts as mastered.
export const REVIEW_INTERVALS_DAYS = [1, 7, 30, 90] as const;

export function firstReviewAt(now: Date) {
  return addDays(now, REVIEW_INTERVALS_DAYS[0]);
}

/** Outcome of one look at an error in the review mode. */
export function nextReviewState(stage: number, gotItRight: boolean, now: Date) {
  if (!gotItRight) {
    // Back to the start: see it again tomorrow.
    return { stage: 0, nextReviewAt: addDays(now, REVIEW_INTERVALS_DAYS[0]), mastered: false };
  }
  const next = stage + 1;
  if (next >= REVIEW_INTERVALS_DAYS.length) {
    return { stage: next, nextReviewAt: now, mastered: true };
  }
  return { stage: next, nextReviewAt: addDays(now, REVIEW_INTERVALS_DAYS[next]), mastered: false };
}

export const COMMON_SOURCES = [
  "Prova da faculdade",
  "SanarFlix",
  "MedCof",
  "Medway",
  "Estratégia MED",
  "Aristo",
  "Residência (prova antiga)",
] as const;
