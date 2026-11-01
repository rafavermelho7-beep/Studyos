// Política de memória: decide o que é salvo, com qual status e proveniência.
// Objetivos: evitar que inferências virem "fatos" (R-08), proteger sensíveis
// (DEC-013), minimizar acúmulo (PEN-14) e evitar duplicatas.

import { z } from "zod";
import { DOMAIN_KEYS } from "@/lib/domains";
import { permissionFor } from "@/lib/governance/permissions";

export const MEMORY_KINDS = [
  "fact",
  "preference",
  "value",
  "belief",
  "event",
  "context",
  "inference",
  "hypothesis",
] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export const SENSITIVITY = ["normal", "sensitive", "restricted"] as const;
export type Sensitivity = (typeof SENSITIVITY)[number];

export const memoryCandidateSchema = z.object({
  kind: z.enum(MEMORY_KINDS),
  content: z.string().trim().min(3).max(500),
  domain: z.enum(DOMAIN_KEYS).nullable().optional(),
  sensitivity: z.enum(SENSITIVITY).default("normal"),
  confidence: z.number().min(0).max(1).default(0.6),
  /** true se o usuário disse isso explicitamente nesta conversa. */
  stated: z.boolean().default(false),
  /** Índice (1-based) de uma memória existente que esta substitui (mudança de opinião/fato). */
  supersedes: z.number().int().min(1).max(50).nullable().optional(),
});
export type MemoryCandidate = z.infer<typeof memoryCandidateSchema>;

export interface MemoryDecision {
  action: "save" | "skip";
  status?: "active" | "proposed";
  source?: "user_stated" | "agent_inferred";
  kind?: MemoryKind;
  confidence?: number;
  reason: string;
}

const INFERRED_KINDS: MemoryKind[] = ["inference", "hypothesis"];
const IDENTITY_KINDS: MemoryKind[] = ["value", "belief"];

/** Normaliza para comparação de duplicatas. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set(["a", "o", "e", "de", "do", "da", "que", "em", "um", "uma", "para", "com", "eu", "meu", "minha", "os", "as", "no", "na", "se", "por", "mais"]);

export function similarity(a: string, b: string): number {
  const ta = new Set(normalize(a).split(" ").filter((w) => w.length > 1 && !STOP.has(w)));
  const tb = new Set(normalize(b).split(" ").filter((w) => w.length > 1 && !STOP.has(w)));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export function decideMemory(c: MemoryCandidate, existing: string[] = []): MemoryDecision {
  if (c.sensitivity === "restricted" && permissionFor("save_restricted_memory") !== "auto") {
    return { action: "skip", reason: "dado restrito: o agente não registra; só o usuário, manualmente" };
  }
  if (existing.some((e) => similarity(e, c.content) >= 0.75)) {
    return { action: "skip", reason: "duplicata de memória existente" };
  }

  const inferred = !c.stated || INFERRED_KINDS.includes(c.kind);
  // Inferências nunca são fatos: força o tipo "hypothesis" e limita a confiança.
  const kind: MemoryKind = inferred && !INFERRED_KINDS.includes(c.kind) ? "hypothesis" : c.kind;
  const confidence = inferred ? Math.min(c.confidence, 0.6) : Math.max(c.confidence, 0.8);
  const source = inferred ? "agent_inferred" : "user_stated";

  if (c.sensitivity === "sensitive") {
    return { action: "save", status: "proposed", source, kind, confidence, reason: "sensível: requer confirmação" };
  }
  if (inferred && IDENTITY_KINDS.includes(c.kind)) {
    return { action: "save", status: "proposed", source, kind, confidence, reason: "inferência sobre identidade: requer confirmação" };
  }
  return {
    action: "save",
    status: "active",
    source,
    kind,
    confidence,
    reason: inferred ? "hipótese registrada (revisável)" : "declarado pelo usuário",
  };
}

export const MAX_MEMORIES_PER_TURN = 5;

/**
 * Substituição (mudança de opinião ou de fato). Só uma declaração explícita do usuário
 * substitui; inferências nunca derrubam memórias. Memória fixada não é substituída
 * automaticamente (as duas ficam, e o usuário decide).
 */
export function decideSupersede(input: {
  newSource: "user_stated" | "agent_inferred";
  newStatus: "active" | "proposed";
  old: { status: string; pinned: boolean } | null;
}): { action: "supersede" | "keep_both"; reason: string } {
  if (!input.old || input.old.status !== "active") return { action: "keep_both", reason: "memória antiga inexistente ou inativa" };
  if (input.newSource !== "user_stated") return { action: "keep_both", reason: "inferência não substitui memória" };
  if (input.newStatus !== "active") return { action: "keep_both", reason: "nova memória aguarda confirmação" };
  if (input.old.pinned) return { action: "keep_both", reason: "memória fixada: decisão do usuário" };
  return { action: "supersede", reason: "declaração explícita mais recente" };
}
