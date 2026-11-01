// Catálogo de modelos e preços (USD por 1M tokens).
//
// Fontes (verificadas em 01/11/2026):
// - Anthropic: tabela oficial de modelos/preços (skill claude-api, cache 2026-10-06).
//   Haiku 5.5: US$0,10 / US$0,50 até 100K tokens de prompt; US$0,50 / US$2,50 acima.
// - OpenAI: anúncio oficial "Introducing GPT-5.4 mini and nano" (openai.com).
//   O painel de preços da OpenAI não pôde ser acessado desta sessão — CONFIRMAR antes
//   de habilitar OpenAI em produção (ver RISK-ASSESSMENT, R-31).
//
// Preços podem ser sobrescritos sem deploy de código via AI_PRICING_OVERRIDES (JSON).

export type Provider = "anthropic" | "openai";
export type Tier = "light" | "standard" | "deep";

export interface ModelSpec {
  id: string;
  provider: Provider;
  tier: Tier;
  label: string;
  inputPerMTok: number;
  outputPerMTok: number;
  cachedInputPerMTok?: number;
  /** Acima deste nº de tokens de entrada aplica-se o preço "long". */
  longContextThreshold?: number;
  longInputPerMTok?: number;
  longOutputPerMTok?: number;
  /** Teto de saída que o LIFE ENGINE usa (não o máximo do modelo). */
  maxOutputTokens: number;
  verified: boolean;
  source: string;
}

export const MODEL_CATALOG: ModelSpec[] = [
  {
    id: "claude-haiku-5-5",
    provider: "anthropic",
    tier: "light",
    label: "Claude Haiku 5.5",
    inputPerMTok: 0.1,
    outputPerMTok: 0.5,
    longContextThreshold: 100_000,
    longInputPerMTok: 0.5,
    longOutputPerMTok: 2.5,
    maxOutputTokens: 2_000,
    verified: true,
    source: "Anthropic — tabela oficial de preços",
  },
  {
    id: "claude-sonnet-5-5",
    provider: "anthropic",
    tier: "standard",
    label: "Claude Sonnet 5.5",
    inputPerMTok: 2,
    outputPerMTok: 10,
    cachedInputPerMTok: 0.2,
    maxOutputTokens: 4_000,
    verified: true,
    source: "Anthropic — tabela oficial de preços",
  },
  {
    id: "claude-opus-5-5",
    provider: "anthropic",
    tier: "deep",
    label: "Claude Opus 5.5",
    inputPerMTok: 4,
    outputPerMTok: 20,
    cachedInputPerMTok: 0.2,
    maxOutputTokens: 8_000,
    verified: true,
    source: "Anthropic — tabela oficial de preços",
  },
  {
    id: "gpt-5.4-nano",
    provider: "openai",
    tier: "light",
    label: "GPT-5.4 nano",
    inputPerMTok: 0.2,
    outputPerMTok: 1.25,
    maxOutputTokens: 2_000,
    verified: false,
    source: "openai.com — anúncio GPT-5.4 mini/nano (confirmar no painel)",
  },
  {
    id: "gpt-5.4-mini",
    provider: "openai",
    tier: "standard",
    label: "GPT-5.4 mini",
    inputPerMTok: 0.75,
    outputPerMTok: 4.5,
    maxOutputTokens: 4_000,
    verified: false,
    source: "openai.com — anúncio GPT-5.4 mini/nano (confirmar no painel)",
  },
];

type Override = Partial<Pick<ModelSpec, "inputPerMTok" | "outputPerMTok" | "maxOutputTokens">> & {
  id: string;
};

/** Aplica AI_PRICING_OVERRIDES='[{"id":"gpt-5.4-mini","inputPerMTok":0.8}]'. */
export function catalogWithOverrides(raw: string | undefined = process.env.AI_PRICING_OVERRIDES): ModelSpec[] {
  if (!raw) return MODEL_CATALOG;
  let overrides: Override[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) overrides = parsed;
  } catch {
    return MODEL_CATALOG; // configuração inválida nunca derruba o sistema
  }
  return MODEL_CATALOG.map((m) => {
    const o = overrides.find((x) => x && x.id === m.id);
    if (!o) return m;
    const num = (v: unknown, fb: number) => (typeof v === "number" && v >= 0 && Number.isFinite(v) ? v : fb);
    return {
      ...m,
      inputPerMTok: num(o.inputPerMTok, m.inputPerMTok),
      outputPerMTok: num(o.outputPerMTok, m.outputPerMTok),
      maxOutputTokens: num(o.maxOutputTokens, m.maxOutputTokens),
      verified: true,
      source: m.source + " + override manual",
    };
  });
}

export function findModel(id: string, catalog: ModelSpec[] = MODEL_CATALOG): ModelSpec | undefined {
  return catalog.find((m) => m.id === id);
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  /** Buscas na web (ferramenta do servidor da Anthropic). */
  webSearches?: number;
}

/** Anthropic web search: US$10 por 1.000 buscas (além dos tokens). */
export const WEB_SEARCH_USD = 0.01;

/** Custo em USD de uma chamada já realizada (ou estimada). */
export function costUSD(model: ModelSpec, usage: TokenUsage): number {
  const cached = Math.max(0, usage.cachedInputTokens ?? 0);
  const uncached = Math.max(0, usage.inputTokens - cached);
  const long =
    model.longContextThreshold !== undefined && usage.inputTokens > model.longContextThreshold;
  const inRate = long ? (model.longInputPerMTok ?? model.inputPerMTok) : model.inputPerMTok;
  const outRate = long ? (model.longOutputPerMTok ?? model.outputPerMTok) : model.outputPerMTok;
  const cachedRate = model.cachedInputPerMTok ?? inRate;
  const usd =
    (uncached * inRate + cached * cachedRate + Math.max(0, usage.outputTokens) * outRate) / 1_000_000 +
    Math.max(0, usage.webSearches ?? 0) * WEB_SEARCH_USD;
  return Math.round(usd * 1e6) / 1e6;
}

/** Estimativa grosseira de tokens para texto em português (~3,5 caracteres/token). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

/** Câmbio usado para converter custo em reais. Conservador por padrão. */
export function usdToBrlRate(raw: string | undefined = process.env.USD_BRL_RATE): number {
  const v = Number(raw);
  // Padrão 5,60: acima das cotações/projeções de 2026 (~5,00–5,20) para errar a favor do teto.
  return Number.isFinite(v) && v > 1 && v < 20 ? v : 5.6;
}
