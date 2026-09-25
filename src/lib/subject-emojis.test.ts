import { describe, it, expect } from "vitest";
import { ALL_SUBJECT_EMOJIS, suggestSubjectEmoji } from "./subject-emojis";

describe("suggestSubjectEmoji", () => {
  it.each([
    ["Saúde da Mulher 1", "🌸"],
    ["Saúde da Criança 1", "👶"],
    ["Cardiologia", "🫀"],
    ["Clínica Médica II", "🩺"],
    ["Genética Médica", "🧬"], // not ⚖️, despite containing "ética"
    ["Bioética", "⚖️"],
    ["Cirurgia Pediátrica", "✂️"], // surgery, not pediatrics
    ["Trabalho de Conclusão de Curso", "🎓"], // not occupational medicine
    ["Medicina do Trabalho", "👷"],
    ["Anatomia Humana", "💀"],
    ["Fisiopatologia", "🔬"],
    ["Urgência e Emergência", "🚑"],
    ["Endocrinologia e Metabologia", "🦋"],
    ["Doenças Tropicais", "🦟"],
    ["Psiquiatria", "💭"],
    ["Nefrologia", "🫘"],
  ])("%s → %s", (name, emoji) => {
    expect(suggestSubjectEmoji(name)).toBe(emoji);
  });

  it("returns null rather than guessing when nothing matches", () => {
    expect(suggestSubjectEmoji("Inglês instrumental")).toBeNull();
  });

  it("only ever suggests emojis the picker offers", () => {
    for (const name of ["Cardio", "Pediatria", "UTI", "Radiologia", "Imunologia"]) {
      expect(ALL_SUBJECT_EMOJIS).toContain(suggestSubjectEmoji(name));
    }
  });

  it("has no duplicate emojis in the picker", () => {
    expect(new Set(ALL_SUBJECT_EMOJIS).size).toBe(ALL_SUBJECT_EMOJIS.length);
  });
});
