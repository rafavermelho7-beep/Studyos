// Validação do payload de saúde enviado pelos Atalhos do iOS (R-18: Apple Saúde
// não tem API web; o iPhone envia agregados diários para o LIFE ENGINE).
import { z } from "zod";

const num = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : typeof v === "string" ? Number(v.replace(",", ".")) : v),
    z.number().min(min).max(max).nullable(),
  );

export const healthDaySchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sleep_minutes: num(0, 1440).optional(),
  sleep_hours: num(0, 24).optional(),
  resting_hr: num(20, 250).optional(),
  hrv_ms: num(0, 500).optional(),
  steps: num(0, 200000).optional(),
  active_kcal: num(0, 20000).optional(),
  workout_minutes: num(0, 1440).optional(),
  workouts: num(0, 50).optional(),
});

export const healthPayloadSchema = z.union([
  z.object({ days: z.array(healthDaySchema).min(1).max(400) }),
  healthDaySchema.transform((d) => ({ days: [d] })),
]);

export function normalizeHealthDays(days: z.infer<typeof healthDaySchema>[]) {
  return days.map((d) => ({
    day: d.day,
    sleep_minutes: d.sleep_minutes ?? (d.sleep_hours != null ? Math.round(d.sleep_hours * 60) : null),
    resting_hr: d.resting_hr != null ? Math.round(d.resting_hr) : null,
    hrv_ms: d.hrv_ms != null ? Math.round(d.hrv_ms) : null,
    steps: d.steps != null ? Math.round(d.steps) : null,
    active_kcal: d.active_kcal != null ? Math.round(d.active_kcal) : null,
    workout_minutes: d.workout_minutes != null ? Math.round(d.workout_minutes) : null,
    workouts: d.workouts != null ? Math.round(d.workouts) : null,
  }));
}
