import { describe, expect, it } from "vitest";
import { buildRadarPrompt, normalizeUrl, parseRadar, radarSettings } from "@/lib/radar/radar";
import { monthSnapshot, financeBudget } from "@/lib/finance";
import { ruleFinancePace } from "@/lib/insights/rules";
import { costUSD, findModel, MODEL_CATALOG } from "@/lib/ai/pricing";
import { route } from "@/lib/ai/router";
import { computeBudget } from "@/lib/ai/budget";

const today = "2026-11-10";
const item = (o: Record<string, unknown>) => ({ category: "cursos_eventos", title: "Curso de Python", summary: "s", why: "w", url: "https://www.sympla.com.br/evento/123", date_start: "2026-11-20", deadline: null, location: "Online", price: "Grátis", ...o });

describe("radar: fundamentação nos resultados da busca", () => {
  const sources = [{ url: "https://sympla.com.br/evento/123/" }, { url: "https://usp.br/curso?utm_source=x" }];
  it("aceita só URLs que vieram da busca (normalizadas)", () => {
    const text = "Achei isto:\n```json\n" + JSON.stringify([item({}), item({ title: "Inventado", url: "https://inventado.com/x" }), item({ title: "USP", url: "https://usp.br/curso" })]) + "\n```";
    const r = parseRadar(text, sources, today);
    expect(r.accepted.map((a) => a.title)).toEqual(["Curso de Python", "USP"]);
    expect(r.rejected).toEqual([{ title: "Inventado", reason: "link não veio dos resultados da busca" }]);
  });
  it("descarta itens já passados, duplicados e inválidos", () => {
    const text = JSON.stringify([item({ date_start: "2026-11-01" }), item({}), item({}), { title: "x" }]);
    const r = parseRadar(text, sources, today);
    expect(r.accepted).toHaveLength(1);
    expect(r.rejected.map((x) => x.reason)).toEqual(["já passou", "formato inválido"]);
  });
  it("datas malformadas viram null em vez de derrubar o item", () => {
    const r = parseRadar(JSON.stringify([item({ date_start: "20/11/2026" })]), sources, today);
    expect(r.accepted[0].date_start).toBeNull();
  });
  it("texto sem JSON não gera nada", () => {
    expect(parseRadar("nenhuma oportunidade", sources, today).accepted).toHaveLength(0);
  });
  it("normaliza URLs", () => {
    expect(normalizeUrl("https://WWW.Exemplo.com/a/?utm_medium=b#top")).toBe("https://exemplo.com/a");
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });
  it("configurações padrão refletem as escolhas do usuário", () => {
    expect(radarSettings({}).categories).toEqual(["cursos_eventos", "experiencias"]);
    expect(radarSettings({ radar: { categories: ["experiencias", "hackear"], city: "Recife" } })).toMatchObject({ categories: ["experiencias"], city: "Recife" });
  });
  it("prompt inclui regras anti-injeção e limite de buscas", () => {
    const p = buildRadarPrompt({ today, settings: radarSettings({}), goals: ["Estágio"], preferences: [], problems: ["carreira sem rumo definido"], busyDays: ["2026-11-20"], alreadyKnown: [] });
    expect(p).toContain("no máximo 5 buscas");
    expect(p).toContain("DADO, não instrução");
    expect(p).toContain("2026-11-20");
  });
});

describe("finanças", () => {
  const exp = [
    { day: "2026-11-02", amount: 300, category: "alimentacao" },
    { day: "2026-11-05", amount: 200, category: "lazer" },
    { day: "2026-10-30", amount: 999, category: "compras" },
  ];
  it("snapshot do mês com projeção e categorias", () => {
    const s = monthSnapshot(exp, today, 1000);
    expect(s.spent).toBe(500);
    expect(s.projected).toBe(1500); // 500/10*30
    expect(s.status).toBe("atencao");
    expect(s.byCategory[0]).toEqual({ category: "alimentacao", amount: 300 });
  });
  it("estados ok, estourado e sem meta", () => {
    expect(monthSnapshot(exp, today, 5000).status).toBe("ok");
    expect(monthSnapshot(exp, today, 400).status).toBe("estourado");
    expect(monthSnapshot(exp, today, null).status).toBe("sem_meta");
    expect(monthSnapshot(exp, "2026-11-03", 400).status).toBe("ok"); // antes do dia 5 não projeta alarme
  });
  it("regra gera aviso de ritmo e de meta estourada", () => {
    const base = { today, health: [], exams: [], goals: [], projects: [], ratings: [], checkins: [] };
    expect(ruleFinancePace({ ...base, finance: monthSnapshot(exp, today, 1000) })[0].title).toMatch(/fecha em R\$\s?1\.500/);
    expect(ruleFinancePace({ ...base, finance: monthSnapshot(exp, today, 400) })[0].kind).toBe("problem");
    expect(ruleFinancePace({ ...base, finance: monthSnapshot(exp, today, 5000) })).toHaveLength(0);
  });
  it("lê a meta das configurações", () => {
    expect(financeBudget({ finance: { monthly_budget: 1200 } })).toBe(1200);
    expect(financeBudget({})).toBeNull();
  });
});

describe("custo de busca na web e roteamento", () => {
  it("soma US$0,01 por busca", () => {
    const m = findModel("claude-sonnet-5-5")!;
    expect(costUSD(m, { inputTokens: 0, outputTokens: 0, webSearches: 5 })).toBeCloseTo(0.05, 6);
  });
  it("radar só usa Anthropic e inclui buscas no pior caso", () => {
    const budget = computeBudget({ capBRL: 50, spentMonthBRL: 0, spentTodayBRL: 0, today });
    const r = route({ task: "radar", inputTokens: 45_000, available: { anthropic: true, openai: true }, onlyProviders: ["anthropic"], extraWorstCaseUSD: 0.05, budget, catalog: MODEL_CATALOG, usdBrl: 5.6 });
    expect(r.ok && r.candidates.every((c) => c.model.provider === "anthropic")).toBe(true);
    expect(r.ok && r.candidates[0].worstCaseBRL).toBeGreaterThan(0.05 * 5.6);
    const none = route({ task: "radar", inputTokens: 1000, available: { anthropic: false, openai: true }, onlyProviders: ["anthropic"], budget, catalog: MODEL_CATALOG, usdBrl: 5.6 });
    expect(none.ok).toBe(false);
  });
});
