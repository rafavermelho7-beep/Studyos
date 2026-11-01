import { describe, expect, it } from "vitest";
import { ruleEnergyStudy, type RulesInput } from "@/lib/insights/rules";
import { decideSupersede, decideMemory, memoryCandidateSchema } from "@/lib/memory/policy";
import { addDays } from "@/lib/dates";
import { buildPersonalContext } from "@/lib/intelligence/context";

const today = "2026-11-30";
const base = (o: Partial<RulesInput>): RulesInput => ({ today, health: [], exams: [], goals: [], projects: [], ratings: [], checkins: [], ...o });

describe("UC-03 energia × estudo", () => {
  // 20 dias: em dias pares estuda Cálculo (energia 2), ímpares Física (energia 4).
  const days = Array.from({ length: 20 }, (_, i) => addDays(today, -i));
  const checkins = days.map((d, i) => ({ day: d, energy: i % 2 === 0 ? 2 : 4 }));
  const sessions = days.map((d, i) => ({ day: d, subject: i % 2 === 0 ? "Cálculo" : "Física", minutes: i % 2 === 0 ? 200 : 60 }));

  it("detecta disciplina associada a energia baixa, com n", () => {
    const r = ruleEnergyStudy(base({ checkins, studySessions: sessions }));
    const calc = r.find((x) => x.title.includes("Cálculo"));
    expect(calc?.title).toBe("Energia mais baixa em dias de Cálculo");
    expect(calc?.body).toMatch(/\(10 dias\)/);
    expect(r.some((x) => x.dedupe_key.startsWith("energy_load"))).toBe(true);
  });
  it("não conclui nada com poucos registros de energia", () => {
    expect(ruleEnergyStudy(base({ checkins: checkins.slice(0, 6), studySessions: sessions }))).toHaveLength(0);
  });
  it("não conclui quando a diferença é pequena", () => {
    const flat = days.map((d, i) => ({ day: d, energy: i % 2 === 0 ? 3 : 3 }));
    expect(ruleEnergyStudy(base({ checkins: flat, studySessions: sessions }))).toHaveLength(0);
  });
  it("energia × sono da noite anterior", () => {
    const health = days.map((d, i) => ({ day: d, sleep_minutes: i % 2 === 0 ? 320 : 450, workouts: 0, workout_minutes: 0 }));
    const r = ruleEnergyStudy(base({ checkins, health }));
    expect(r.some((x) => x.title === "Noites curtas, energia menor no dia seguinte")).toBe(true);
  });
});

describe("substituição de memória", () => {
  const old = { status: "active", pinned: false };
  it("declaração explícita substitui memória ativa", () => {
    expect(decideSupersede({ newSource: "user_stated", newStatus: "active", old }).action).toBe("supersede");
  });
  it("inferência, proposta pendente ou memória fixada não substituem", () => {
    expect(decideSupersede({ newSource: "agent_inferred", newStatus: "active", old }).action).toBe("keep_both");
    expect(decideSupersede({ newSource: "user_stated", newStatus: "proposed", old }).action).toBe("keep_both");
    expect(decideSupersede({ newSource: "user_stated", newStatus: "active", old: { status: "active", pinned: true } }).action).toBe("keep_both");
    expect(decideSupersede({ newSource: "user_stated", newStatus: "active", old: null }).action).toBe("keep_both");
  });
  it("campo supersedes é validado", () => {
    expect(memoryCandidateSchema.safeParse({ kind: "preference", content: "Prefere estudar à noite", supersedes: 2 }).success).toBe(true);
    expect(memoryCandidateSchema.safeParse({ kind: "preference", content: "Prefere estudar à noite", supersedes: 0 }).success).toBe(false);
  });
  it("política continua salvando a nova declaração", () => {
    const c = memoryCandidateSchema.parse({ kind: "preference", content: "Prefere estudar à noite", stated: true, supersedes: 1 });
    expect(decideMemory(c, []).status).toBe("active");
  });
});

describe("contexto com carga de estudo", () => {
  it("lista horas por disciplina", () => {
    const out = buildPersonalContext({
      now: "", today, displayName: "", memories: [], goals: [], projects: [], checkins: [], upcomingExams: [], openInsights: [],
      studyLoad: [{ subject: "Cálculo", minutes: 390, days: 3 }],
    });
    expect(out).toContain("- Cálculo: 6.5h em 3 dia(s)");
  });
});
