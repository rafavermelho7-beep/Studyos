// Modo véspera: order an exam's topics weakest-first and split the time
// left between them. Pure, so the weighting is unit-tested. Like the
// planning engine, the weight only needs to ORDER topics sensibly — it is
// not shown to the user as a number (no fake "readiness %").

export type VesperaTopicSignals = {
  status: "NOVO" | "APRENDENDO" | "REVISANDO" | "DOMINADO";
  /** Estimated recall 0–1 from FSRS, or null if never reviewed. */
  retention: number | null;
  /** Concepts in the Caderno de Erros for this topic not yet marked as fixed. */
  openErrors: number;
};

const STATUS_WEIGHT = { NOVO: 4, APRENDENDO: 3, REVISANDO: 2, DOMINADO: 1 } as const;

export function weakness({ status, retention, openErrors }: VesperaTopicSignals) {
  return (
    STATUS_WEIGHT[status] +
    (retention === null ? 0 : (1 - retention) * 3) + // forgotten matters, but less than never learned
    Math.min(openErrors, 3) // each open concept counts, capped so errors can't dominate
  );
}

/**
 * Minutes per topic, proportional to weakness, in 5-minute steps with a
 * 10-minute floor (anything shorter isn't a real pass over a topic). The
 * floor can push the total slightly over budget; better than skipping a
 * topic the night before.
 */
export function allocateMinutes(weights: number[], totalMinutes: number) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0 || totalMinutes <= 0) return weights.map(() => 0);
  return weights.map((w) => Math.max(10, Math.round(((w / sum) * totalMinutes) / 5) * 5));
}
