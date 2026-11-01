import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { availableProviders, loadBudget } from "@/lib/ai/engine";
import { balanceSnapshot } from "@/lib/balance";
import { addDays, formatDatePt, greetingFor, localDate } from "@/lib/dates";
import { domainLabel } from "@/lib/domains";
import { refreshInsights } from "@/lib/services/insights-engine";
import { syncCalendar } from "@/lib/services/calendar";
import { isExamTitle } from "@/lib/google/calendar";
import { isRadarStale, lastRadarRun } from "@/lib/services/radar";
import { OpportunityCard, type OpportunityRow } from "@/components/opportunity-card";
import { RadarTrigger } from "@/components/radar-trigger";
import { getAmbientSpace, listMessages } from "@/lib/services/spaces";
import { PresenceOrb } from "@/components/presence";
import { Conversation, type Msg } from "@/components/conversation";
import { Synthesis } from "@/components/synthesis";
import { Signals, type InsightItem, type ProposalItem } from "@/components/signals";
import { BalanceConstellation } from "@/components/balance-constellation";
import { QuickCheckin } from "@/components/quick-checkin";
import { Card, SectionTitle } from "@/components/ui";

const providers0 = availableProviders;

export default async function AmbientPage() {
  const { supabase, owner } = await requireOwner();
  const today = localDate(new Date(), owner.timezone);

  // Agenda: sincroniza no máximo a cada 30 min ao abrir (falhas não bloqueiam a página).
  await syncCalendar(supabase, owner.timezone).catch(() => null);
  // Regras determinísticas rodam a cada abertura (custo zero de IA).
  await refreshInsights(supabase, today).catch(() => 0);

  const [space, synthesis, insights, proposals, ratings, goals, checkin, exams, pendingMem, budget, agenda, opps, lastRadar, integ] = await Promise.all([
    getAmbientSpace(supabase),
    supabase.from("syntheses").select("content, model").eq("kind", "daily").eq("period_start", today).maybeSingle(),
    supabase
      .from("insights")
      .select("id, kind, title, body, domain, confidence, origin, created_at")
      .in("status", ["new", "seen"])
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("proposals").select("id, type, payload, rationale").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
    supabase.from("domain_ratings").select("domain, score, week_start").gte("week_start", addDays(today, -21)),
    supabase.from("goals").select("id, title, domain, progress, target_date").eq("status", "active").order("target_date", { ascending: true, nullsFirst: false }).limit(4),
    supabase.from("checkins").select("energy, mood, sleep_quality, note").eq("day", today).maybeSingle(),
    supabase.from("study_events").select("title, day").gte("day", today).lte("day", addDays(today, 14)).order("day").limit(3),
    supabase.from("memories").select("id", { count: "exact", head: true }).eq("status", "proposed"),
    loadBudget(supabase, owner.timezone),
    supabase.from("calendar_events").select("google_id, title, start_at, all_day, day").gte("day", today).lte("day", addDays(today, 14)).order("start_at").limit(80),
    supabase.from("opportunities").select("*").eq("status", "new").order("found_at", { ascending: false }).limit(3),
    lastRadarRun(supabase),
    supabase.from("integrations").select("status").eq("provider", "google_calendar").maybeSingle(),
  ]);
  const radarAvailable = providers0().anthropic && (budget.mode === "normal" || budget.mode === "economy");
  const radarStale = isRadarStale(lastRadar);
  const todayAgenda = (agenda.data ?? []).filter((e) => e.day === today).slice(0, 6);
  const upcoming = [...(exams.data ?? []), ...(agenda.data ?? []).filter((e) => isExamTitle(e.title)).map((e) => ({ title: e.title, day: e.day }))]
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(0, 4);
  const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: owner.timezone, hour: "2-digit", minute: "2-digit" });
  const messages = await listMessages(supabase, space.id, 40);
  const bal = balanceSnapshot(ratings.data ?? []);
  const providers = providers0();
  const aiAvailable = (providers.anthropic || providers.openai) && budget.mode !== "blocked";
  const name = owner.displayName ? `, ${owner.displayName}` : "";

  return (
    <div className="pt-6 sm:pt-10">
      {/* Estado ambiente: visão contextual discreta */}
      <section className="flex flex-col items-center text-center">
        <PresenceOrb size={112} showLabel />
        <h1 className="mt-6 text-[26px] font-light tracking-tight text-text sm:text-[34px]">
          {greetingFor(new Date(), owner.timezone)}
          {name}.
        </h1>
        <p className="mt-1.5 text-[13px] text-text-3 first-letter:uppercase">{formatDatePt(today)}</p>
        {(pendingMem.count ?? 0) > 0 && (
          <Link href="/memory?tab=review" className="mt-3 text-[12.5px] text-[hsl(262_80%_78%)] hover:underline">
            {pendingMem.count} memória(s) aguardando sua confirmação
          </Link>
        )}
      </section>

      <div className="mt-10 grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="rise">
          <SectionTitle eyebrow="Síntese de hoje" />
          <Synthesis kind="daily" initial={synthesis.data ?? null} autoGenerate aiAvailable={aiAvailable} />
        </Card>

        <Card className="rise" >
          <SectionTitle eyebrow="Sinais" action={<span className="label">{(insights.data?.length ?? 0) + (proposals.data?.length ?? 0)}</span>} />
          <Signals insights={(insights.data ?? []) as InsightItem[]} proposals={(proposals.data ?? []) as ProposalItem[]} />
        </Card>
      </div>

      <div className="mt-4 grid items-start gap-4 md:grid-cols-3">
        <Card className="rise">
          <SectionTitle eyebrow="Equilíbrio" action={<Link href="/context#equilibrio" className="label hover:text-text-2">Avaliar</Link>} />
          <div className="flex flex-col items-center">
            <BalanceConstellation scores={bal.scores} />
            <p className="mt-2 text-center text-[13px] text-text-3">
              {bal.index !== null
                ? <>Índice <span className="text-text">{bal.index}</span>/100{bal.lowest[0] ? ` · atenção a ${domainLabel(bal.lowest[0].domain).toLowerCase()}` : ""}</>
                : bal.rated
                  ? `${bal.rated} de 11 domínios avaliados — avalie ao menos 5 para o índice.`
                  : "Sem autoavaliação nesta semana."}
            </p>
          </div>
        </Card>

        <Card className="rise">
          <SectionTitle eyebrow="Foco" action={<Link href="/goals" className="label hover:text-text-2">Objetivos</Link>} />
          {goals.data?.length ? (
            <ul className="space-y-4">
              {goals.data.map((g) => (
                <li key={g.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[14px] text-text">{g.title}</span>
                    <span className="label shrink-0">{g.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-signal/70" style={{ width: `${g.progress}%` }} />
                  </div>
                  <div className="label mt-1">{domainLabel(g.domain)}{g.target_date ? ` · até ${g.target_date.split("-").reverse().join("/")}` : ""}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-text-3">Nenhum objetivo ativo. Conte ao JARVIS o que quer construir nos próximos anos — ele propõe, você confirma.</p>
          )}
          {todayAgenda.length ? (
            <div className="mt-5 border-t border-line pt-4">
              <div className="label mb-2">Agenda de hoje</div>
              {todayAgenda.map((e) => (
                <div key={e.google_id} className="flex justify-between gap-3 text-[13px] text-text-2">
                  <span className="truncate">{e.title}</span>
                  <span className="shrink-0 text-text-3">{e.all_day ? "dia todo" : timeFmt.format(new Date(e.start_at))}</span>
                </div>
              ))}
            </div>
          ) : null}
          {upcoming.length ? (
            <div className="mt-5 border-t border-line pt-4">
              <div className="label mb-2">Próximas provas</div>
              {upcoming.map((e) => (
                <div key={e.day + e.title} className="flex justify-between text-[13px] text-text-2">
                  <span>{e.title}</span>
                  <span className="text-text-3">{e.day.split("-").reverse().slice(0, 2).join("/")}</span>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="rise">
          <SectionTitle eyebrow="Registro do dia" />
          <QuickCheckin initial={checkin.data ?? null} />
        </Card>
      </div>

      <Card className="rise mt-4">
        <SectionTitle eyebrow="Radar · oportunidades" action={<RadarTrigger auto={radarStale} available={radarAvailable} />} />
        {opps.data?.length ? (
          <ul className="grid gap-3 md:grid-cols-3">
            {(opps.data as OpportunityRow[]).map((o) => (
              <OpportunityCard key={o.id} o={o} calendarConnected={!!integ.data} compact />
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-text-3">
            Nenhuma oportunidade nova. O radar pesquisa cursos, eventos e experiências uma vez por semana. <Link href="/radar" className="text-text-2 hover:underline">Ajustar interesses</Link>
          </p>
        )}
      </Card>

      <Conversation spaceId={null} variant="ambient" initialMessages={messages as Msg[]} placeholder="Fale com o JARVIS…  ( / para focar )" />
    </div>
  );
}
