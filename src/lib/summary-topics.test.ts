import { describe, expect, it } from "vitest";
import { extractHeadingTopics, topicKey } from "./summary-topics";

describe("extractHeadingTopics", () => {
  it("takes # lines as topics, in order", () => {
    const summary = "Aula de IST\n\n# Sífilis\nTreponema pallidum\n\n## HPV\nVacina\n### Herpes genital\nAciclovir";
    expect(extractHeadingTopics(summary)).toEqual(["Sífilis", "HPV", "Herpes genital"]);
  });

  it("ignores plain text, hashtags without a space and empty headings", () => {
    expect(extractHeadingTopics("texto\n#semespaco\n#   \n#### quatro é demais\nC# linguagem")).toEqual([]);
  });

  it("cleans emphasis and trailing #s, and drops repeats ignoring case and accents", () => {
    expect(extractHeadingTopics("# **Sífilis** #\n# sifilis\n#  Clamídia  ")).toEqual(["Sífilis", "Clamídia"]);
  });
});

describe("topicKey", () => {
  it("matches names regardless of case, accents and spacing", () => {
    expect(topicKey("  Pré-natal  de baixo risco")).toBe(topicKey("pre-natal de BAIXO risco"));
  });
});
