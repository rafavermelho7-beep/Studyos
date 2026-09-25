import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";

// Cronograma automático: spread the topics of every upcoming exam over the
// days left, using the hours the user said they have per weekday. Pure and
// deterministic, so it's unit-tested; the service recomputes it on every
// read from current data (topic status, FSRS, open concepts), which is why
// there's no stored plan and no "replanejar" button — studying, changing a
// status or adding an exam re-plans by itself.
//
// Rules:
// - The day right before an exam is its véspera: that exam gets the whole
//   day (as one "Modo véspera" block), other exams pause.
// - Otherwise a day's time is cut into BLOCK_MINUTES blocks and shared
//   between active exams, closer exams first (urgency = 1 / days left).
// - Within an exam, blocks go to topics in proportion to their weakness
//   (lib/vespera.ts), weakest first, so weak topics come back more often.
// Both splits use the same "highest weight / (blocks already given + 1)"
// rule, which spreads blocks proportionally without randomness.

export const BLOCK_MINUTES = 30;
/** Never plan further out than this — beyond it the plan is noise. */
export const MAX_PLAN_DAYS = 60;

export type PlanExam = {
  id: string;
  date: Date;
  topics: { id: string; weight: number }[];
};

export type PlanBlock =
  | { kind: "study"; examId: string; topicId: string; minutes: number }
  | { kind: "vespera"; examId: string; minutes: number };

export type PlanDay = { date: Date; blocks: PlanBlock[] };

/** Index of the item with the highest weight / (given + 1); ties go to the earlier item. */
function nextByShare(weights: number[], given: number[]) {
  let best = -1;
  let bestScore = 0;
  weights.forEach((w, i) => {
    const score = w / (given[i] + 1);
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}

/** Splits `minutes` into blocks of BLOCK_MINUTES; a remainder of 15+ min becomes its own shorter block. */
function blockSizes(minutes: number) {
  const sizes = Array<number>(Math.floor(minutes / BLOCK_MINUTES)).fill(BLOCK_MINUTES);
  const rest = minutes % BLOCK_MINUTES;
  if (rest >= 15) sizes.push(rest);
  else if (rest > 0 && sizes.length > 0) sizes[sizes.length - 1] += rest;
  return sizes;
}

export function buildPlan(
  exams: PlanExam[],
  /** Minutes available per weekday, index 0 = Sunday (Date#getDay). */
  minutesByWeekday: number[],
  today: Date,
): PlanDay[] {
  const start = startOfDay(today);
  const upcoming = exams.filter((e) => differenceInCalendarDays(e.date, start) >= 1);
  if (upcoming.length === 0) return [];
  const lastDay = Math.min(MAX_PLAN_DAYS, Math.max(...upcoming.map((e) => differenceInCalendarDays(e.date, start))));

  // Blocks already given, per exam and per topic, across the whole plan —
  // so a topic studied Monday isn't first in line again on Tuesday.
  const topicGiven = new Map(upcoming.map((e) => [e.id, e.topics.map(() => 0)]));

  const days: PlanDay[] = [];
  for (let offset = 0; offset < lastDay; offset++) {
    const date = addDays(start, offset);
    const minutes = Math.max(0, minutesByWeekday[date.getDay()] ?? 0);
    const blocks: PlanBlock[] = [];
    days.push({ date, blocks });
    if (minutes === 0) continue;

    const daysLeft = (e: PlanExam) => differenceInCalendarDays(e.date, date);
    const eve = upcoming.filter((e) => daysLeft(e) === 1);
    if (eve.length > 0) {
      // Two exams on the same day share the véspera evenly.
      const share = Math.floor(minutes / eve.length / 5) * 5;
      for (const e of eve) blocks.push({ kind: "vespera", examId: e.id, minutes: share });
      continue;
    }

    const active = upcoming.filter((e) => daysLeft(e) > 1 && e.topics.length > 0);
    if (active.length === 0) continue;
    const urgency = active.map((e) => 1 / daysLeft(e));
    const examGiven = active.map(() => 0);

    for (const size of blockSizes(minutes)) {
      const ei = nextByShare(urgency, examGiven);
      examGiven[ei]++;
      const exam = active[ei];
      const given = topicGiven.get(exam.id)!;
      // Weight 0 would never be picked; every linked topic deserves a turn.
      const ti = nextByShare(
        exam.topics.map((t) => Math.max(t.weight, 0.1)),
        given,
      );
      given[ti]++;
      const topicId = exam.topics[ti].id;
      // Consecutive blocks of the same topic merge into one longer block.
      const prev = blocks.at(-1);
      if (prev?.kind === "study" && prev.topicId === topicId) prev.minutes += size;
      else blocks.push({ kind: "study", examId: exam.id, topicId, minutes: size });
    }
  }
  return days;
}

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** Stored value → exactly 7 non-negative whole minutes (unknown/missing → 0). */
export function readWeeklyMinutes(stored: number[]) {
  return WEEKDAY_LABELS.map((_, i) => Math.max(0, Math.min(24 * 60, Math.round(stored[i] ?? 0))));
}
