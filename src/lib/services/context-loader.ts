import "server-only";
// Carrega (com RLS) os dados que alimentam o contexto do JARVIS.

import type { Supabase } from "@/lib/supabase/server";
import type { Owner } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { balanceSnapshot } from "@/lib/balance";
import type { ContextInput, ContextMemory } from "@/lib/intelligence/context";

const MEMORY_COLS = "id, kind, content, domain, confidence, source, updated_at, valid_until";

export async function loadContext(
  supabase: Supabase,
  owner: Owner,
  opts: { query: string; space?: ContextInput["space"] },
): Promise<{ input: ContextInput; memoryIds: string[]; memoryTexts: string[] }> {
  const today = localDate(new Date(), owner.timezone);
  const [relevant, core, goals, projects, checkins, exams, ratings, insights] = await Promise.all([
    supabase.rpc("match_memories", { p_query: opts.query.slice(0, 2000), p_limit: 12 }),
    // Núcleo de identidade: fixadas e valores/preferências de alta confiança.
    supabase
      .from("memories")
      .select(MEMORY_COLS)
      .eq("status", "active")
      .neq("sensitivity", "restricted")
      .or("pinned.eq.true,kind.in.(value,preference,belief)")
      .order("pinned", { ascending: false })
      .order("confidence", { ascending: false })
      .limit(10),
    supabase
      .from("goals")
      .select("title, domain, horizon, status, progress, target_date")
      .eq("status", "active")
      .order("target_date", { ascending: true, nullsFirst: false })
      .limit(12),
    supabase.from("projects").select("title, status, next_action, due_date").eq("status", "active").limit(10),
    supabase
      .from("checkins")
      .select("day, energy, mood, sleep_quality, note")
      .gte("day", addDays(today, -7))
      .order("day", { ascending: false }),
    supabase
      .from("study_events")
      .select("title, day")
      .gte("day", today)
      .lte("day", addDays(today, 30))
      .order("day"),
    supabase.from("domain_ratings").select("domain, score, week_start").gte("week_start", addDays(today, -21)),
    supabase.from("insights").select("title, kind").eq("status", "new").limit(5),
  ]);

  const seen = new Set<string>();
  const memories: (ContextMemory & { id: string })[] = [];
  for (const m of [...((core.data ?? []) as (ContextMemory & { id: string })[]), ...((relevant.data ?? []) as (ContextMemory & { id: string })[])]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    memories.push(m);
  }
  const bal = balanceSnapshot(ratings.data ?? []);

  return {
    memoryIds: memories.map((m) => m.id),
    memoryTexts: memories.map((m) => m.content),
    input: {
      now: new Date().toISOString(),
      today,
      displayName: owner.displayName,
      space: opts.space ?? null,
      memories,
      goals: goals.data ?? [],
      projects: projects.data ?? [],
      checkins: checkins.data ?? [],
      upcomingExams: exams.data ?? [],
      balance: bal.rated ? { index: bal.index, lowest: bal.lowest } : null,
      openInsights: insights.data ?? [],
    },
  };
}
