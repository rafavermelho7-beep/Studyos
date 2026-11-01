import { describe, expect, it } from "vitest";
import { computeBudget, dailyCap, parseCap, canAfford } from "@/lib/ai/budget";
import { MODEL_CATALOG, catalogWithOverrides, costUSD, findModel, usdToBrlRate } from "@/lib/ai/pricing";
import { classifyChat, route, capTierForBudget } from "@/lib/ai/router";

const today = "2026-11-15";
const budget = (spentMonthBRL: number, spentTodayBRL = 0) =>
  computeBudget({ capBRL: 50, spentMonthBRL, spentTodayBRL, today });

describe("pricing", () => {
  it("calcula custo de Sonnet 5.5 corretamente", () => {
    const m = findModel("claude-sonnet-5-5")!;
    expect(costUSD(m, { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBe(12);
  });
  it("aplica preço de contexto longo do Haiku acima de 100K", () => {
    const m = findModel("claude-haiku-5-5")!;
    expect(costUSD(m, { inputTokens: 200_000, outputTokens: 0 })).toBeCloseTo(0.1, 6);
    expect(costUSD(m, { inputTokens: 50_000, outputTokens: 0 })).toBeCloseTo(0.005, 6);
  });
  it("usa preço de cache para tokens em cache", () => {
    const m = findModel("claude-sonnet-5-5")!;
    expect(costUSD(m, { inputTokens: 1_000_000, cachedInputTokens: 1_000_000, outputTokens: 0 })).toBeCloseTo(0.2, 6);
  });
  it("overrides inválidos não quebram o catálogo", () => {
    expect(catalogWithOverrides("{lixo")).toBe(MODEL_CATALOG);
    const c = catalogWithOverrides('[{"id":"gpt-5.4-mini","inputPerMTok":0.9,"outputPerMTok":-1}]');
    const m = c.find((x) => x.id === "gpt-5.4-mini")!;
    expect(m.inputPerMTok).toBe(0.9);
    expect(m.outputPerMTok).toBe(4.5); // negativo ignorado
  });
  it("câmbio padrão conservador e validado", () => {
    expect(usdToBrlRate(undefined)).toBe(5.6);
    expect(usdToBrlRate("abc")).toBe(5.6);
    expect(usdToBrlRate("5.2")).toBe(5.2);
  });
});

describe("budget", () => {
  it("teto nunca passa de R$50", () => {
    expect(parseCap("200")).toBe(50);
    expect(parseCap("30")).toBe(30);
    expect(parseCap(undefined)).toBe(50);
    expect(parseCap("-5")).toBe(50);
  });
  it("modos por faixa de uso", () => {
    expect(budget(10).mode).toBe("normal");
    expect(budget(36).mode).toBe("economy");
    expect(budget(46).mode).toBe("critical");
    expect(budget(50).mode).toBe("blocked");
    expect(budget(80).remainingBRL).toBe(0);
  });
  it("teto diário força modo crítico", () => {
    const cap = dailyCap(50, today); // 30 dias => 5,00
    expect(cap).toBe(5);
    expect(budget(10, 5).mode).toBe("critical");
    expect(budget(10, 5).dailyCapReached).toBe(true);
  });
  it("canAfford respeita o restante", () => {
    expect(canAfford(budget(49.9), 0.05)).toBe(true);
    expect(canAfford(budget(49.9), 0.2)).toBe(false);
    expect(canAfford(budget(50), 0)).toBe(false);
  });
});

describe("router", () => {
  const base = {
    inputTokens: 4000,
    available: { anthropic: true, openai: true },
    catalog: MODEL_CATALOG,
    usdBrl: 5.6,
  };
  it("classifica mensagens triviais como leves", () => {
    expect(classifyChat("oi").tier).toBe("light");
    expect(classifyChat("Bom dia!").tier).toBe("light");
  });
  it("classifica dilemas como padrão e /profundo como profundo", () => {
    expect(classifyChat("Devo trocar de carreira agora ou depois da formatura?").tier).toBe("standard");
    expect(classifyChat("/profundo revise meus objetivos").tier).toBe("deep");
  });
  it("escolhe Anthropic por padrão e oferece fallback OpenAI no mesmo nível", () => {
    const r = route({ ...base, task: "chat", userText: "Devo priorizar o estágio ou a pesquisa?", budget: budget(0) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidates[0].model.id).toBe("claude-sonnet-5-5");
    expect(r.candidates[1].model.id).toBe("gpt-5.4-mini");
    // fallback nunca sobe de nível
    expect(r.candidates.every((c) => c.model.tier !== "deep")).toBe(true);
  });
  it("respeita provedor preferido", () => {
    const r = route({ ...base, task: "extract", preferredProvider: "openai", budget: budget(0) });
    expect(r.ok && r.candidates[0].model.id).toBe("gpt-5.4-nano");
  });
  it("usa só o provedor disponível", () => {
    const r = route({ ...base, available: { anthropic: false, openai: true }, task: "daily_synthesis", budget: budget(0) });
    expect(r.ok && r.candidates.map((c) => c.model.provider)).toEqual(["openai", "openai"]);
  });
  it("rebaixa profundo em modo economia e tudo para leve em modo crítico", () => {
    expect(capTierForBudget("deep", budget(40))).toBe("standard");
    expect(capTierForBudget("standard", budget(46))).toBe("light");
    const r = route({ ...base, task: "chat", userText: "/profundo analise minha vida", budget: budget(46) });
    expect(r.ok && r.candidates[0].model.tier).toBe("light");
  });
  it("bloqueia quando o orçamento acabou", () => {
    const r = route({ ...base, task: "chat", userText: "oi", budget: budget(50) });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe("budget_blocked");
  });
  it("recusa quando nenhum provedor está configurado", () => {
    const r = route({ ...base, available: { anthropic: false, openai: false }, task: "chat", userText: "oi", budget: budget(0) });
    expect(!r.ok && r.code).toBe("no_provider");
  });
  it("descarta candidatos cujo pior caso não cabe no restante", () => {
    const r = route({ ...base, inputTokens: 900_000, task: "chat", userText: "/profundo x", budget: budget(49) });
    // Com R$1 restante e 900K tokens de entrada, nenhum modelo cabe
    expect(r.ok).toBe(false);
  });
});
