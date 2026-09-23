import { differenceInCalendarDays, endOfMonth, getDate, getDaysInMonth } from "date-fns";

// Pure math for the "Meta do mês" card, kept apart from the query so the
// edge cases (last day, goal already met, first day) are unit-testable.
// Studied time always comes from summing StudyEvent — never a counter.

export function monthGoalProgress(goalMinutes: number, studiedSec: number, now: Date) {
  const goalSec = goalMinutes * 60;
  const daysInMonth = getDaysInMonth(now);
  // Today counts as a day you can still study on.
  const daysLeft = differenceInCalendarDays(endOfMonth(now), now) + 1;
  const remainingSec = Math.max(0, goalSec - studiedSec);
  // Where you'd be by the end of today studying evenly all month.
  const expectedByTodaySec = (goalSec * getDate(now)) / daysInMonth;

  return {
    goalSec,
    studiedSec,
    percent: Math.min(100, Math.round((studiedSec / goalSec) * 100)),
    remainingSec,
    daysLeft,
    perDayNeededSec: remainingSec / daysLeft,
    done: studiedSec >= goalSec,
    onPace: studiedSec >= expectedByTodaySec,
  };
}
