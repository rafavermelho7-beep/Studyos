import { describe, it, expect } from "vitest";
import { differenceInCalendarDays } from "date-fns";
import { nextReviewState } from "./error-review";

const now = new Date(2026, 8, 25, 10);
const days = (d: Date) => differenceInCalendarDays(d, now);

describe("nextReviewState", () => {
  it("widens 1 → 7 → 30 → 90 days, then counts it as mastered", () => {
    let stage = 0;
    const seen: number[] = [];
    for (let i = 0; i < 3; i++) {
      const next = nextReviewState(stage, true, now);
      seen.push(days(next.nextReviewAt));
      expect(next.mastered).toBe(false);
      stage = next.stage;
    }
    expect(seen).toEqual([7, 30, 90]);
    expect(nextReviewState(stage, true, now).mastered).toBe(true);
  });

  it('"ainda erraria" sends it back to tomorrow from any stage', () => {
    const next = nextReviewState(3, false, now);
    expect(next).toMatchObject({ stage: 0, mastered: false });
    expect(days(next.nextReviewAt)).toBe(1);
  });
});
