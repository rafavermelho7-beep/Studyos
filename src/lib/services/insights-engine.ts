import "server-only";
// Roda as regras determinísticas e grava avisos novos (sem duplicar, sem
// "ressuscitar" avisos que o usuário dispensou).

import type { Supabase } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";
import { runRules } from "@/lib/insights/rules";
import { audit } from "@/lib/governance/audit";
import { isExamTitle } from "@/lib/google/calendar";

export async function refreshInsights(supabase: Supabase, today: string): Promise<number> {
  const since = addDays(today, -60);
  const [health, exams, goals, projects, ratings, checkins, calendar, study] = await Promise.all([
    supabase.from("health_daily").select("day, sleep_minutes, workouts, workout_minutes").gte("day", since),
    supabase.from("study_events").select("day, title").gte("day", since),
    supabase.from("goals").select("id, title, domain, status, target_date, horizon, updated_at").eq("status", "active"),
    supabase.from("projects").select("id, title, status, updated_at, next_action").eq("status", "active"),
    supabase.from("domain_ratings").select("domain, week_start, score").gte("week_start", addDays(today, -21)),
    supabase.from("checkins").select("day, energy").gte("day", since),
    supabase.from("calendar_events").select("day, title").gte("day", since),
    supabase.from("study_sessions").select("day, subject, minutes").gte("day", since),
  ]);
  const examRows = [...(exams.data ?? []), ...(calendar.data ?? []).filter((e) => isExamTitle(e.title))];

  const drafts = runRules({
    today,
    health: health.data ?? [],
    exams: examRows,
    goals: goals.data ?? [],
    projects: projects.data ?? [],
    ratings: ratings.data ?? [],
    checkins: checkins.data ?? [],
    studySessions: study.data ?? [],
  });
  if (!drafts.length) return 0;

  const { data, error } = await supabase
    .from("insights")
    .upsert(
      drafts.map((d) => ({ ...d, origin: "rule" })),
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
    )
    .select("id");
  if (error) {
    console.error("[insights] falha:", error.message);
    return 0;
  }
  const created = data?.length ?? 0;
  if (created) await audit(supabase, "agent", "insight.create", "insight", null, { count: created });
  return created;
}
