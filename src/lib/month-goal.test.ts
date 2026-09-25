import { describe, it, expect } from "vitest";
import { monthGoalProgress } from "./month-goal";

const HOUR = 3600;

describe("monthGoalProgress", () => {
  it("spreads what's left over the remaining days, today included", () => {
    // 60h goal, 10h done, Sep 21 → Sep 21..30 = 10 days left.
    const p = monthGoalProgress(60 * 60, 10 * HOUR, new Date(2026, 8, 21, 15));
    expect(p.daysLeft).toBe(10);
    expect(p.remainingSec).toBe(50 * HOUR);
    expect(p.perDayNeededSec).toBe(5 * HOUR);
    expect(p.percent).toBe(17);
    expect(p.onPace).toBe(false); // 21/30 of 60h = 42h expected by now
    expect(p.done).toBe(false);
  });

  it("on the last day, everything left is for today", () => {
    const p = monthGoalProgress(30 * 60, 29 * HOUR, new Date(2026, 8, 30, 9));
    expect(p.daysLeft).toBe(1);
    expect(p.perDayNeededSec).toBe(HOUR);
  });

  it("caps at 100% and stops asking for more once the goal is met", () => {
    const p = monthGoalProgress(10 * 60, 12 * HOUR, new Date(2026, 8, 5));
    expect(p.percent).toBe(100);
    expect(p.done).toBe(true);
    expect(p.remainingSec).toBe(0);
    expect(p.perDayNeededSec).toBe(0);
  });

  it("is on pace on day one after a single day's share", () => {
    const p = monthGoalProgress(30 * 60, HOUR, new Date(2026, 8, 1, 20));
    expect(p.onPace).toBe(true);
  });
});
