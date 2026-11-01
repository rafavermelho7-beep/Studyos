import "server-only";
// Executor de IA: orçamento → roteamento → provedor (com fallback) → registro de uso.
// Toda chamada de IA do sistema passa por aqui; não há outro caminho para os provedores.

import type { Supabase } from "@/lib/supabase/server";
import { aiKeys } from "@/lib/env";
import { localDate, monthStart } from "@/lib/dates";
import { computeBudget, parseCap, type BudgetState } from "./budget";
import { catalogWithOverrides, costUSD, estimateTokens, usdToBrlRate, WEB_SEARCH_USD, type Provider, type Tier } from "./pricing";
import { route, type AITask, type RouteDecision } from "./router";
import { createAnthropicProvider } from "./providers/anthropic";
import { createOpenAIProvider } from "./providers/openai";
import { ProviderError, type AIProvider, type ChatMessage } from "./providers/types";

export async function loadBudget(supabase: Supabase, timezone: string): Promise<BudgetState> {
  const today = localDate(new Date(), timezone);
  const { data, error } = await supabase.rpc("ai_spend", { p_month_start: monthStart(today), p_today: today });
  if (error) throw new Error("Falha ao ler gastos de IA: " + error.message);
  const row = (Array.isArray(data) ? data[0] : data) as { month_brl: number; today_brl: number } | null;
  return computeBudget({
    capBRL: parseCap(),
    spentMonthBRL: Number(row?.month_brl ?? 0),
    spentTodayBRL: Number(row?.today_brl ?? 0),
    today,
  });
}

function providers(): Partial<Record<Provider, AIProvider>> {
  const k = aiKeys();
  return {
    ...(k.anthropic ? { anthropic: createAnthropicProvider(k.anthropic) } : {}),
    ...(k.openai ? { openai: createOpenAIProvider(k.openai) } : {}),
  };
}

export function availableProviders(): Record<Provider, boolean> {
  const k = aiKeys();
  return { anthropic: !!k.anthropic, openai: !!k.openai };
}

export class AIUnavailableError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AIUnavailableError";
  }
}

export interface RunAIParams {
  supabase: Supabase;
  timezone: string;
  task: AITask;
  system: string;
  messages: ChatMessage[];
  userText?: string;
  forceTier?: Tier;
  preferredProvider?: Provider | null;
  jsonSchema?: Record<string, unknown>;
  webSearch?: { maxUses: number; city?: string | null };
  onText?: (delta: string) => void;
  onRoute?: (info: { model: string; label: string; tier: Tier; reason: string }) => void;
  signal?: AbortSignal;
}

export interface RunAIResult {
  text: string;
  model: string;
  provider: Provider;
  tier: Tier;
  costBRL: number;
  sources: { url: string; title: string }[];
  webSearches: number;
  decision: RouteDecision;
  budget: BudgetState;
}

export async function runAI(p: RunAIParams): Promise<RunAIResult> {
  const budget = await loadBudget(p.supabase, p.timezone);
  const catalog = catalogWithOverrides();
  const usdBrl = usdToBrlRate();
  // Resultados de busca entram como tokens de entrada: reservamos ~8k tokens por busca no pior caso.
  const inputTokens =
    estimateTokens(p.system) +
    p.messages.reduce((s, m) => s + estimateTokens(m.content), 0) +
    (p.webSearch ? p.webSearch.maxUses * 8_000 : 0);
  if (p.webSearch && budget.mode === "critical") {
    throw new AIUnavailableError("Orçamento crítico: pesquisa na web pausada até o orçamento normalizar.", "budget_insufficient");
  }

  const decision = route({
    task: p.task,
    userText: p.userText,
    inputTokens,
    forceTier: p.forceTier,
    preferredProvider: p.preferredProvider ?? undefined,
    onlyProviders: p.webSearch ? ["anthropic"] : undefined,
    extraWorstCaseUSD: p.webSearch ? p.webSearch.maxUses * WEB_SEARCH_USD : 0,
    available: availableProviders(),
    budget,
    catalog,
    usdBrl,
  });
  if (!decision.ok) throw new AIUnavailableError(decision.reason, decision.code);

  const impls = providers();
  const today = localDate(new Date(), p.timezone);
  let lastError: unknown = null;
  let emitted = false;

  for (const cand of decision.candidates) {
    const impl = impls[cand.model.provider];
    if (!impl) continue;
    p.onRoute?.({ model: cand.model.id, label: cand.model.label, tier: cand.model.tier, reason: decision.reason });
    try {
      const result = await impl.generate(
        {
          model: cand.model,
          system: p.system,
          messages: p.messages,
          maxOutputTokens: cand.maxOutputTokens,
          effort: cand.effort,
          jsonSchema: p.jsonSchema,
          minimalReasoning: p.task === "extract" || p.task === "title" || p.task === "summarize",
          webSearch: p.webSearch ? { ...p.webSearch, timezone: p.timezone } : undefined,
          signal: p.signal,
        },
        p.onText
          ? (d) => {
              emitted = true;
              p.onText!(d);
            }
          : undefined,
      );
      const usd = costUSD(cand.model, result.usage);
      const brl = Math.round(usd * usdBrl * 10_000) / 10_000;
      await logUsage(p.supabase, {
        local_day: today,
        task: p.task,
        provider: cand.model.provider,
        model: cand.model.id,
        input_tokens: result.usage.inputTokens,
        cached_input_tokens: result.usage.cachedInputTokens ?? 0,
        output_tokens: result.usage.outputTokens,
        cost_usd: usd,
        cost_brl: brl,
        ok: true,
      });
      return {
        text: result.text,
        model: cand.model.id,
        provider: cand.model.provider,
        tier: cand.model.tier,
        costBRL: brl,
        sources: result.sources ?? [],
        webSearches: result.usage.webSearches ?? 0,
        decision,
        budget,
      };
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      await logUsage(p.supabase, {
        local_day: today,
        task: p.task,
        provider: cand.model.provider,
        model: cand.model.id,
        ok: false,
        error: message.slice(0, 500),
      });
      // Não tentar outro modelo se já houve texto parcial (evita resposta duplicada),
      // se foi cancelado, ou se o erro não é recuperável.
      if (emitted || (err instanceof Error && err.name === "AbortError")) break;
      if (err instanceof ProviderError && !err.retryable) break;
    }
  }
  const msg = lastError instanceof Error ? lastError.message : "falha desconhecida";
  throw new AIUnavailableError(`Não foi possível obter resposta da IA: ${msg}`, "provider_error");
}

async function logUsage(
  supabase: Supabase,
  row: {
    local_day: string;
    task: string;
    provider: string;
    model: string;
    input_tokens?: number;
    cached_input_tokens?: number;
    output_tokens?: number;
    cost_usd?: number;
    cost_brl?: number;
    ok: boolean;
    error?: string;
  },
) {
  const { error } = await supabase.from("ai_usage").insert(row);
  if (error) console.error("[ai_usage] falha ao registrar uso:", error.message);
}
