import { describe, it, expect } from "vitest";
import { allocateMinutes, weakness } from "./vespera";

describe("weakness", () => {
  it("never studied beats mastered-but-fresh", () => {
    expect(weakness({ status: "NOVO", retention: null, openErrors: 0 })).toBeGreaterThan(
      weakness({ status: "DOMINADO", retention: 0.95, openErrors: 0 }),
    );
  });

  it("a 'dominado' topic that's been forgotten and missed in questions climbs the list", () => {
    const shaky = weakness({ status: "DOMINADO", retention: 0.4, openErrors: 2 });
    const learning = weakness({ status: "APRENDENDO", retention: null, openErrors: 0 });
    expect(shaky).toBeGreaterThan(learning);
  });

  it("caps the contribution of errors", () => {
    const many = weakness({ status: "REVISANDO", retention: null, openErrors: 30 });
    const three = weakness({ status: "REVISANDO", retention: null, openErrors: 3 });
    expect(many).toBe(three);
  });
});

describe("allocateMinutes", () => {
  it("splits proportionally in 5-minute steps", () => {
    expect(allocateMinutes([3, 1], 120)).toEqual([90, 30]);
  });

  it("gives every topic at least 10 minutes", () => {
    expect(allocateMinutes([10, 1], 60)).toEqual([55, 10]);
  });

  it("returns zeros when there's no time or nothing to weigh", () => {
    expect(allocateMinutes([1, 2], 0)).toEqual([0, 0]);
    expect(allocateMinutes([], 60)).toEqual([]);
  });
});
