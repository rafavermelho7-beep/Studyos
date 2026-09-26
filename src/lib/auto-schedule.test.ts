import { describe, expect, it } from "vitest";
import { addDays } from "date-fns";
import { buildPlan, readWeeklyMinutes, type PlanBlock } from "./auto-schedule";

// A Sunday, local midnight.
const today = new Date(2026, 8, 27);
const everyDay = (minutes: number) => Array(7).fill(minutes);

function studyBlocks(blocks: PlanBlock[]) {
  return blocks.filter((b): b is Extract<PlanBlock, { kind: "study" }> => b.kind === "study");
}

describe("buildPlan", () => {
  it("returns nothing without upcoming exams", () => {
    expect(buildPlan([], everyDay(120), today)).toEqual([]);
    const past = { id: "p", date: today, topics: [{ id: "t", weight: 1 }] };
    expect(buildPlan([past], everyDay(120), today)).toEqual([]);
  });

  it("plans every day up to the exam, with the day before as véspera", () => {
    const exam = { id: "e", date: addDays(today, 4), topics: [{ id: "t", weight: 1 }] };
    const days = buildPlan([exam], everyDay(60), today);
    expect(days).toHaveLength(4);
    expect(days[3].blocks).toEqual([{ kind: "vespera", examId: "e", minutes: 60 }]);
    for (const day of days.slice(0, 3)) {
      expect(day.blocks).toEqual([{ kind: "study", examId: "e", topicId: "t", minutes: 60 }]);
    }
  });

  it("gives weak topics more blocks than strong ones, weakest first", () => {
    const exam = {
      id: "e",
      date: addDays(today, 11),
      topics: [
        { id: "weak", weight: 6 },
        { id: "strong", weight: 2 },
      ],
    };
    const days = buildPlan([exam], everyDay(60), today);
    const blocks = days.flatMap((d) => studyBlocks(d.blocks));
    const minutes = (id: string) => blocks.filter((b) => b.topicId === id).reduce((s, b) => s + b.minutes, 0);
    expect(blocks[0].topicId).toBe("weak");
    expect(minutes("weak")).toBeGreaterThan(minutes("strong") * 2);
    expect(minutes("strong")).toBeGreaterThan(0);
  });

  it("gives the closer exam more time", () => {
    const soon = { id: "soon", date: addDays(today, 5), topics: [{ id: "a", weight: 3 }] };
    const later = { id: "later", date: addDays(today, 30), topics: [{ id: "b", weight: 3 }] };
    const first = buildPlan([soon, later], everyDay(180), today)[0];
    const byExam = (id: string) => studyBlocks(first.blocks).filter((b) => b.examId === id).reduce((s, b) => s + b.minutes, 0);
    expect(byExam("soon")).toBeGreaterThan(byExam("later"));
    expect(byExam("soon") + byExam("later")).toBe(180);
  });

  it("pauses other exams on a véspera and skips days without time", () => {
    const soon = { id: "soon", date: addDays(today, 2), topics: [{ id: "a", weight: 1 }] };
    const later = { id: "later", date: addDays(today, 10), topics: [{ id: "b", weight: 1 }] };
    const weekly = [0, 90, 90, 90, 90, 90, 90]; // Sundays off
    const days = buildPlan([soon, later], weekly, today);
    expect(days[0].blocks).toEqual([]); // Sunday
    expect(days[1].blocks).toEqual([{ kind: "vespera", examId: "soon", minutes: 90 }]);
    expect(studyBlocks(days[2].blocks).every((b) => b.examId === "later")).toBe(true);
  });

  it("keeps the whole day's time, folding small remainders into the last block", () => {
    const exam = { id: "e", date: addDays(today, 3), topics: [{ id: "a", weight: 2 }, { id: "b", weight: 2 }] };
    for (const minutes of [40, 50, 75, 20]) {
      const [day] = buildPlan([exam], everyDay(minutes), today);
      expect(day.blocks.reduce((s, b) => s + b.minutes, 0)).toBe(minutes);
    }
  });
});

describe("readWeeklyMinutes", () => {
  it("pads, clamps and rounds to 7 whole days", () => {
    expect(readWeeklyMinutes([])).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(readWeeklyMinutes([60, -5, 2000, 45.4])).toEqual([60, 0, 1440, 45, 0, 0, 0]);
  });
});
