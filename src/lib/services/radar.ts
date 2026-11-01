import "server-only";
import type { Supabase } from "@/lib/supabase/server";
import type { Owner } from "@/lib/auth";
import { runAI, AIUnavailableError } from "@/lib/ai/engine";
import { addDays, localDate } from "@/lib/dates";
import { audit } from "@/lib/governance/audit";
import { isExamTitle } from "@/lib/google/calendar";
import { RADAR_SYSTEM, buildRadarPrompt, parseRadar, radarSettings, sourceDomain } from "@/lib/radar/radar";

export const RADAR_AUTO_DAYS = 7;
export const RADAR_MANUAL_PER_DAY = 2;

export function isRadarStale(last: { created_at: string } | null | undefined): boolean {
  return !last || Date.now() - Date.parse(last.created_at) > RADAR_AUTO_DAYS * 86_400_000;
}

export async function lastRadarRun(supabase: Supabase) {
  const { data } = await supabase.from("radar_runs").select("created_at, status, found").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

export async function runRadar(supabase: Supabase, owner: Owner, trigger: "auto" | "manual") {
  const today = localDate(new Date(), owner.timezone);
  if (trigger === "manual") {
    const { count } = await supabase
      .from("radar_runs")
      .select("id", { count: "exact", head: true })
      .eq("trigger", "manual")
      .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
    if ((count ?? 0) >= RADAR_MANUAL_PER_DAY) {
      return { ok: false as const, error: `Limite de ${RADAR_MANUAL_PER_DAY} buscas manuais por dia (controle de custo).` };
    }
  } else {
    const last = await lastRadarRun(supabase);
    if (last && Date.now() - Date.parse(last.created_at) < RADAR_AUTO_DAYS * 86_400_000) return { ok: true as const, skipped: true, found: 0 };
  }

  const [profile, goals, prefs, ratings, exams, cal, known] = await Promise.all([
    supabase.from("profiles").select("settings").eq("id", owner.id).single(),
    supabase.from("goals").select("title").eq("status", "active").limit(10),
    supabase
      .from("memories")
      .select("content")
      .eq("status", "active")
      .eq("sensitivity", "normal")
      .in("kind", ["preference", "value"])
      .order("confidence", { ascending: false })
      .limit(10),
    supabase.from("domain_ratings").select("domain, score").gte("week_start", addDays(today, -21)).lte("score", 4),
    supabase.from("study_events").select("day").gte("day", today).lte("day", addDays(today, 60)),
    supabase.from("calendar_events").select("day, title").gte("day", today).lte("day", addDays(today, 60)),
    supabase.from("opportunities").select("title").order("found_at", { ascending: false }).limit(30),
  ]);
  const settings = radarSettings(profile.data?.settings);
  const problems = [
    ...new Set((ratings.data ?? []).map((r) => ({ carreira: "carreira sem rumo definido", financas: "dinheiro sem controle", espiritualidade: "falta de propósito", identidade: "falta de propósito" } as Record<string, string>)[r.domain]).filter(Boolean)),
  ];
  const busy = [...new Set([...(exams.data ?? []).map((e) => e.day), ...(cal.data ?? []).filter((e) => isExamTitle(e.title)).map((e) => e.day)])];

  try {
    const r = await runAI({
      supabase,
      timezone: owner.timezone,
      task: "radar",
      system: RADAR_SYSTEM,
      messages: [
        {
          role: "user",
          content: buildRadarPrompt({
            today,
            settings,
            goals: (goals.data ?? []).map((g) => g.title),
            preferences: (prefs.data ?? []).map((m) => m.content),
            problems,
            busyDays: busy,
            alreadyKnown: (known.data ?? []).map((k) => k.title),
          }),
        },
      ],
      preferredProvider: "anthropic",
      webSearch: { maxUses: 5, city: settings.city || null },
    });
    const parsed = parseRadar(r.text, r.sources, today);
    let found = 0;
    if (parsed.accepted.length) {
      const { data, error } = await supabase
        .from("opportunities")
        .upsert(
          parsed.accepted.map((o) => ({ ...o, date_start: o.date_start ?? null, deadline: o.deadline ?? null, source_domain: sourceDomain(o.url) })),
          { onConflict: "user_id,url", ignoreDuplicates: true },
        )
        .select("id");
      if (error) throw new Error(error.message);
      found = data?.length ?? 0;
    }
    await supabase.from("radar_runs").insert({ trigger, status: "ok", found, searches: r.webSearches, cost_brl: r.costBRL });
    await audit(supabase, "agent", "radar.run", "opportunities", null, { found, rejected: parsed.rejected.length, searches: r.webSearches });
    return { ok: true as const, skipped: false, found, rejected: parsed.rejected.length, costBRL: r.costBRL };
  } catch (e) {
    const msg = e instanceof AIUnavailableError ? e.message : "Falha ao pesquisar oportunidades.";
    if (!(e instanceof AIUnavailableError)) console.error("[radar]", e);
    await supabase.from("radar_runs").insert({ trigger, status: "error", error: msg.slice(0, 300) });
    return { ok: false as const, error: msg };
  }
}
