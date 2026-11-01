import { describe, expect, it } from "vitest";
import { decideMemory, similarity, memoryCandidateSchema } from "@/lib/memory/policy";
import { parseExtraction } from "@/lib/intelligence/extraction";
import { permissionFor } from "@/lib/governance/permissions";

const cand = (o: Partial<Parameters<typeof memoryCandidateSchema.parse>[0]>) =>
  memoryCandidateSchema.parse({ kind: "fact", content: "Treina musculação três vezes por semana", ...o });

describe("política de memória", () => {
  it("fato declarado e não sensível é salvo ativo com alta confiança", () => {
    const d = decideMemory(cand({ stated: true, confidence: 0.5 }));
    expect(d).toMatchObject({ action: "save", status: "active", source: "user_stated" });
    expect(d.confidence).toBeGreaterThanOrEqual(0.8);
  });
  it("inferência vira hipótese com confiança limitada", () => {
    const d = decideMemory(cand({ kind: "fact", stated: false, confidence: 0.95 }));
    expect(d).toMatchObject({ action: "save", kind: "hypothesis", source: "agent_inferred" });
    expect(d.confidence).toBeLessThanOrEqual(0.6);
  });
  it("inferência sobre valores/crenças exige confirmação", () => {
    const d = decideMemory(cand({ kind: "value", stated: false, content: "Valoriza estabilidade acima de tudo" }));
    expect(d.status).toBe("proposed");
  });
  it("sensível exige confirmação; restrito nunca é salvo pelo agente", () => {
    expect(decideMemory(cand({ sensitivity: "sensitive", stated: true })).status).toBe("proposed");
    expect(decideMemory(cand({ sensitivity: "restricted", stated: true })).action).toBe("skip");
  });
  it("detecta duplicatas", () => {
    expect(similarity("Treina musculação três vezes por semana", "treina musculacao 3 vezes por semana")).toBeGreaterThan(0.5);
    const d = decideMemory(cand({ stated: true }), ["Treina musculação três vezes por semana."]);
    expect(d.action).toBe("skip");
  });
});

describe("extração", () => {
  it("faz parse de JSON com cercas e valida", () => {
    const raw = '```json\n{"memories":[{"kind":"preference","content":"Prefere estudar de manhã","domain":"estudos","sensitivity":"normal","confidence":0.9,"stated":true}],"proposals":[],"space_title":"Rotina de estudos"}\n```';
    const e = parseExtraction(raw)!;
    expect(e.memories).toHaveLength(1);
    expect(e.space_title).toBe("Rotina de estudos");
  });
  it("rejeita domínio inválido e lixo", () => {
    expect(parseExtraction('{"memories":[{"kind":"fact","content":"abc def","domain":"marte"}],"proposals":[]}')).toBeNull();
    expect(parseExtraction("não sei")).toBeNull();
  });
});

describe("matriz de permissões", () => {
  it("nega por padrão ações desconhecidas", () => {
    expect(permissionFor("apagar_tudo")).toBe("forbidden");
  });
  it("classifica ações-chave", () => {
    expect(permissionFor("create_insight")).toBe("auto");
    expect(permissionFor("create_goal")).toBe("confirm");
    expect(permissionFor("external_message")).toBe("forbidden");
    expect(permissionFor("modify_budget")).toBe("forbidden");
    expect(permissionFor("web_browse")).toBe("forbidden");
  });
});
