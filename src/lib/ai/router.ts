// AI Router: escolhe provedor e modelo por tarefa, complexidade, orçamento e
// disponibilidade de chaves. Lógica pura e determinística (testável).

import type { BudgetState } from "./budget";
import { canAfford } from "./budget";
import { costUSD, estimateTokens, type ModelSpec, type Provider, type Tier } from "./pricing";

export type AITask =
  | "chat"
  | "extract" // extração de memória/propostas após uma conversa
  | "daily_synthesis"
  | "weekly_review"
  | "title"
  | "summarize"; // resumo incremental de espaço

export type Effort = "low" | "medium" | "high";

export interface RouteRequest {
  task: AITask;
  /** Texto do usuário (para chat) — usado na heurística de complexidade. */
  userText?: string;
  /** Estimativa de tokens de entrada (contexto completo). */
  inputTokens: number;
  /** Força um nível (ex.: comando /profundo). Ainda sujeito ao orçamento. */
  forceTier?: Tier;
  preferredProvider?: Provider;
  available: Record<Provider, boolean>;
  budget: BudgetState;
  catalog: ModelSpec[];
  usdBrl: number;
}

export interface RouteCandidate {
  model: ModelSpec;
  maxOutputTokens: number;
  effort: Effort;
  worstCaseBRL: number;
}

export interface RouteDecision {
  ok: true;
  tier: Tier;
  requestedTier: Tier;
  candidates: RouteCandidate[]; // em ordem de preferência (fallback)
  reason: string;
}

export interface RouteRefusal {
  ok: false;
  reason: string;
  code: "budget_blocked" | "budget_insufficient" | "no_provider";
}

const TIER_ORDER: Tier[] = ["light", "standard", "deep"];

const DEEP_TRIGGERS = /(^|\s)\/profundo\b|pense (com )?profundidade|an[aá]lise profunda/i;
const COMPLEX_HINTS =
  /decis|decid|estrat[eé]g|planej|plano|conflit|objetiv|carreira|prioriz|compar|analis|revis|dilema|trade-?off|equil[ií]brio|por que|porqu[eê]|devo\b|vale a pena|organiz|como (eu )?(devo|posso|fa[cç]o)|ajud/i;
const TRIVIAL = /^(oi|ol[aá]|bom dia|boa tarde|boa noite|obrigad[oa]|valeu|ok|beleza|tudo bem\??)[\s!.?]*$/i;

/** Classifica a complexidade de uma mensagem de chat em um nível. */
export function classifyChat(text: string): { tier: Tier; reason: string } {
  const t = text.trim();
  if (DEEP_TRIGGERS.test(t)) return { tier: "deep", reason: "pedido explícito de análise profunda" };
  if (TRIVIAL.test(t)) return { tier: "light", reason: "mensagem trivial" };
  let score = 0;
  if (t.length > 280) score++;
  if (t.length > 1200) score++;
  if (COMPLEX_HINTS.test(t)) score++;
  if ((t.match(/\?/g) ?? []).length >= 2) score++;
  if (score === 0) return { tier: "light", reason: "mensagem curta e direta" };
  return { tier: "standard", reason: "raciocínio estratégico necessário" };
}

const TASK_BASE: Record<Exclude<AITask, "chat">, Tier> = {
  extract: "light",
  title: "light",
  summarize: "light",
  daily_synthesis: "standard",
  weekly_review: "standard",
};

const TASK_OUTPUT: Record<AITask, number> = {
  chat: 1_800,
  extract: 1_200,
  title: 200,
  summarize: 700,
  daily_synthesis: 900,
  weekly_review: 2_200,
};

/** Rebaixa o nível conforme o modo do orçamento. */
export function capTierForBudget(tier: Tier, budget: BudgetState): Tier {
  if (budget.mode === "critical") return "light";
  if (budget.mode === "economy" && tier === "deep") return "standard";
  return tier;
}

function effortFor(tier: Tier, task: AITask): Effort {
  if (task === "extract" || task === "title" || task === "summarize") return "low";
  if (tier === "deep") return "medium";
  return "low";
}

/** Ordem de níveis a tentar: o escolhido, depois mais baratos (nunca mais caros). */
function tierFallbacks(tier: Tier): Tier[] {
  const idx = TIER_ORDER.indexOf(tier);
  return TIER_ORDER.slice(0, idx + 1).reverse();
}

export function route(req: RouteRequest): RouteDecision | RouteRefusal {
  if (req.budget.mode === "blocked") {
    return { ok: false, code: "budget_blocked", reason: req.budget.message };
  }
  const providers = (Object.keys(req.available) as Provider[]).filter((p) => req.available[p]);
  if (providers.length === 0) {
    return { ok: false, code: "no_provider", reason: "Nenhuma chave de API de IA configurada." };
  }

  let requested: Tier;
  let reason: string;
  if (req.forceTier) {
    requested = req.forceTier;
    reason = "nível solicitado explicitamente";
  } else if (req.task === "chat") {
    const c = classifyChat(req.userText ?? "");
    requested = c.tier;
    reason = c.reason;
  } else {
    requested = TASK_BASE[req.task];
    reason = `nível padrão da tarefa ${req.task}`;
  }

  const tier = capTierForBudget(requested, req.budget);
  if (tier !== requested) reason += `; rebaixado para ${tier} (${req.budget.mode})`;

  // Preferência de provedor: escolhido > anthropic > openai.
  const providerOrder: Provider[] = [
    ...(req.preferredProvider && providers.includes(req.preferredProvider) ? [req.preferredProvider] : []),
    ...(["anthropic", "openai"] as Provider[]).filter(
      (p) => providers.includes(p) && p !== req.preferredProvider,
    ),
  ];

  const candidates: RouteCandidate[] = [];
  for (const t of tierFallbacks(tier)) {
    for (const p of providerOrder) {
      const model = req.catalog.find((m) => m.provider === p && m.tier === t);
      if (!model) continue;
      const maxOut = Math.min(TASK_OUTPUT[req.task], model.maxOutputTokens);
      const worstUSD = costUSD(model, { inputTokens: req.inputTokens, outputTokens: maxOut });
      const worstCaseBRL = worstUSD * req.usdBrl;
      if (!canAfford(req.budget, worstCaseBRL)) continue;
      candidates.push({ model, maxOutputTokens: maxOut, effort: effortFor(t, req.task), worstCaseBRL });
    }
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      code: "budget_insufficient",
      reason: "O restante do orçamento não cobre o pior caso desta chamada.",
    };
  }
  return { ok: true, tier: candidates[0].model.tier, requestedTier: requested, candidates, reason };
}

export { estimateTokens };
