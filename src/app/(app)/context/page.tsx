import { requireOwner } from "@/lib/auth";
import { availableProviders, loadBudget } from "@/lib/ai/engine";
import { addDays, localDate, weekStart } from "@/lib/dates";
import { DOMAINS } from "@/lib/domains";
import { addExpense, addStudyEvent, addStudySession, saveFinanceBudget, saveRatings } from "@/app/actions";
import { EXPENSE_CATEGORIES, brl as brlFmt, financeBudget, monthSnapshot } from "@/lib/finance";
import { ActionForm, Card, SectionTitle } from "@/components/ui";
import { Synthesis } from "@/components/synthesis";
import { RatingSlider, DeleteEventButton, DeleteSessionButton, DeleteExpenseButton } from "./controls";

export const metadata = { title: "Contexto · LIFE ENGINE" };

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hm = (m: number | null) => (m == null ? "–" : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`);

export default async function ContextPage() {
  const { supabase, owner } = await requireOwner();
  const today = localDate(new Date(), owner.timezone);
  const week = weekStart(today);
  const [budget, ratings, health, events, checkins, usage, weekly, expenses, profile, sessions] = await Promise.all([
    loadBudget(supabase, owner.timezone),
    supabase.from("domain_ratings").select("domain, score").eq("week_start", week),
    supabase.from("health_daily").select("*").gte("day", addDays(today, -13)).order("day", { ascending: false }),
    supabase.from("study_events").select("id, title, subject, kind, day").gte("day", addDays(today, -7)).order("day"),
    supabase.from("checkins").select("day, energy, mood, sleep_quality, note").gte("day", addDays(today, -13)).order("day", { ascending: false }),
    supabase
      .from("ai_usage")
      .select("created_at, task, model, input_tokens, output_tokens, cost_brl, ok")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("syntheses").select("content, model").eq("kind", "weekly").eq("period_start", week).maybeSingle(),
    supabase.from("expenses").select("id, day, amount, category, note").gte("day", today.slice(0, 8) + "01").order("day", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("profiles").select("settings").eq("id", owner.id).single(),
    supabase.from("study_sessions").select("id, day, subject, minutes, focus").gte("day", addDays(today, -6)).order("day", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  const monthBudget = financeBudget(profile.data?.settings);
  const fin = monthSnapshot((expenses.data ?? []).map((e) => ({ ...e, amount: Number(e.amount) })), today, monthBudget);
  const subjects = [...new Set((sessions.data ?? []).map((s) => s.subject))];
  const weekMinutes = (sessions.data ?? []).reduce((a, s) => a + s.minutes, 0);
  const current = Object.fromEntries((ratings.data ?? []).map((r) => [r.domain, r.score]));
  const providers = availableProviders();
  const aiAvailable = (providers.anthropic || providers.openai) && budget.mode !== "blocked";

  return (
    <div className="pt-8">
      <div className="mb-8">
        <div className="label mb-2">Contexto e acompanhamento</div>
        <h1 className="text-[28px] font-light tracking-tight">O estado das coisas</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <SectionTitle eyebrow="Revisão semanal" title={`Semana de ${week.split("-").reverse().join("/")}`} />
          <Synthesis kind="weekly" initial={weekly.data ?? null} autoGenerate={false} aiAvailable={aiAvailable} />
        </Card>

        <Card>
          <div id="equilibrio" className="scroll-mt-24" />
          <SectionTitle eyebrow="Equilíbrio · autoavaliação" title="Como está cada domínio nesta semana?" />
          <p className="-mt-2 mb-4 text-[13px] text-text-3">0 = negligenciado · 10 = pleno. Só você define o que é equilíbrio para você.</p>
          <ActionForm action={saveRatings} submitLabel="Salvar semana" resetOnSuccess={false}>
            <div className="space-y-3">
              {DOMAINS.map((d) => (
                <RatingSlider key={d.key} name={`score_${d.key}`} label={d.label} hue={d.hue} initial={current[d.key]} />
              ))}
            </div>
          </ActionForm>
        </Card>

        <div className="space-y-4">
          <Card>
            <div id="orcamento" className="scroll-mt-24" />
            <SectionTitle eyebrow="Orçamento de IA" title={`${brl(budget.spentMonthBRL)} de ${brl(budget.capBRL)}`} />
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full ${budget.mode === "normal" ? "bg-signal/70" : budget.mode === "blocked" ? "bg-danger" : "bg-warm"}`}
                style={{ width: `${Math.max(1, budget.usedRatio * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-[13px] text-text-3">
              {budget.message} Hoje: {brl(budget.spentTodayBRL)} (teto diário {brl(budget.dailyCapBRL)}).
            </p>
            <p className="mt-1 text-[12.5px] text-text-3">
              Provedores: Anthropic {providers.anthropic ? "✓" : "— sem chave"} · OpenAI {providers.openai ? "✓" : "— sem chave"}
            </p>
            {usage.data?.length ? (
              <table className="mt-4 w-full text-left text-[12px]">
                <thead className="label">
                  <tr>
                    <th className="pb-2 font-normal">Quando</th>
                    <th className="pb-2 font-normal">Tarefa</th>
                    <th className="pb-2 font-normal">Modelo</th>
                    <th className="pb-2 text-right font-normal">Custo</th>
                  </tr>
                </thead>
                <tbody className="text-text-2">
                  {usage.data.map((u, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="py-1.5">{new Date(u.created_at).toLocaleString("pt-BR", { timeZone: owner.timezone, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                      <td>{u.task}</td>
                      <td className="text-text-3">{u.model}</td>
                      <td className={`text-right ${u.ok ? "" : "text-danger"}`}>{u.ok ? brl(Number(u.cost_brl)) : "falhou"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </Card>

          <Card>
            <SectionTitle eyebrow="Provas e prazos" />
            {events.data?.length ? (
              <ul className="mb-4 space-y-2">
                {events.data.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 text-[14px]">
                    <span className={e.day < today ? "text-text-3 line-through" : "text-text"}>
                      {e.title}
                      {e.subject ? <span className="text-text-3"> · {e.subject}</span> : null}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="label">{e.day.split("-").reverse().join("/")}</span>
                      <DeleteEventButton id={e.id} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-[13.5px] text-text-3">Registre provas para o JARVIS cruzar com sono e energia (UC-01, UC-03).</p>
            )}
            <ActionForm action={addStudyEvent} submitLabel="Adicionar">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <input name="title" required placeholder="Ex.: P2 de Cálculo" className="field" />
                <input name="day" type="date" required className="field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input name="subject" placeholder="Disciplina (opcional)" className="field" />
                <select name="kind" className="field" defaultValue="exam">
                  <option value="exam">Prova</option>
                  <option value="deadline">Entrega</option>
                  <option value="presentation">Apresentação</option>
                </select>
              </div>
            </ActionForm>
          </Card>
        </div>

        <Card>
          <div id="dinheiro" className="scroll-mt-24" />
          <SectionTitle eyebrow="Dinheiro · este mês" title={`${brlFmt(fin.spent)}${fin.budget ? ` de ${brlFmt(fin.budget)}` : ""}`} />
          {fin.budget ? (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${fin.status === "ok" ? "bg-signal/70" : fin.status === "estourado" ? "bg-danger" : "bg-warm"}`}
                  style={{ width: `${Math.min(100, Math.max(1, (fin.spent / fin.budget) * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-[13px] text-text-3">
                Projeção para o fim do mês: <span className={fin.projected > fin.budget ? "text-warm" : "text-text-2"}>{brlFmt(fin.projected)}</span> (média diária × dias do mês).
              </p>
            </>
          ) : (
            <p className="-mt-2 text-[13px] text-text-3">Defina uma meta mensal para o JARVIS acompanhar o ritmo.</p>
          )}
          {fin.byCategory.length > 0 && (
            <p className="mt-2 text-[13px] text-text-3">
              {fin.byCategory.slice(0, 4).map((c) => `${EXPENSE_CATEGORIES[c.category]} ${brlFmt(c.amount)}`).join(" · ")}
            </p>
          )}
          <div className="mt-4">
            <ActionForm action={addExpense} submitLabel="Registrar gasto">
              <div className="grid grid-cols-[110px_1fr] gap-3">
                <input name="amount" inputMode="decimal" required placeholder="R$ 0,00" aria-label="Valor" className="field" />
                <select name="category" defaultValue="alimentacao" aria-label="Categoria" className="field">
                  {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <input name="note" maxLength={200} placeholder="O quê (opcional)" aria-label="Descrição do gasto" className="field" />
            </ActionForm>
          </div>
          <details className="mt-4">
            <summary className="label cursor-pointer hover:text-text-2">Meta mensal e lançamentos</summary>
            <div className="mt-3 space-y-4">
              <ActionForm action={saveFinanceBudget} submitLabel="Salvar meta" resetOnSuccess={false}>
                <input name="monthly_budget" inputMode="decimal" defaultValue={monthBudget ?? ""} placeholder="Meta mensal (R$)" aria-label="Meta mensal" className="field" />
              </ActionForm>
              {expenses.data?.length ? (
                <ul className="space-y-1.5 text-[13px]">
                  {expenses.data.slice(0, 15).map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-text-2">{EXPENSE_CATEGORIES[e.category as keyof typeof EXPENSE_CATEGORIES]}{e.note ? <span className="text-text-3"> · {e.note}</span> : null}</span>
                      <span className="flex shrink-0 items-center gap-3"><span className="text-text-2">{brlFmt(Number(e.amount))}</span><span className="label">{e.day.split("-").reverse().slice(0, 2).join("/")}</span><DeleteExpenseButton id={e.id} /></span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </details>
          <p className="mt-3 text-[12px] text-text-3">Só totais por categoria vão para a IA; descrições ficam no seu banco.</p>
        </Card>

        <Card>
          <SectionTitle eyebrow="Estudo · últimos 7 dias" title={weekMinutes ? `${Math.round(weekMinutes / 6) / 10}h estudadas` : undefined} />
          <p className="-mt-2 mb-4 text-[13px] text-text-3">Registrar o que estudou permite cruzar com sua energia (UC-03). Leva 5 segundos.</p>
          <ActionForm action={addStudySession} submitLabel="Registrar sessão">
            <div className="grid grid-cols-[1fr_96px] gap-3">
              <input name="subject" required maxLength={80} list="subjects" placeholder="Disciplina" className="field" aria-label="Disciplina" />
              <input name="minutes" type="number" min={5} max={720} step={5} required placeholder="min" className="field" aria-label="Minutos" />
            </div>
            <datalist id="subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
            <div className="grid grid-cols-2 gap-3">
              <select name="focus" defaultValue="" className="field" aria-label="Foco">
                <option value="">Foco (opcional)</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Foco {n}</option>)}
              </select>
              <input name="day" type="date" max={today} defaultValue={today} className="field" aria-label="Dia" />
            </div>
          </ActionForm>
          {sessions.data?.length ? (
            <ul className="mt-4 space-y-1.5 text-[13.5px]">
              {sessions.data.slice(0, 10).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <span className="text-text-2">{s.subject} <span className="text-text-3">· {s.minutes} min{s.focus ? ` · foco ${s.focus}` : ""}</span></span>
                  <span className="flex items-center gap-3"><span className="label">{s.day.split("-").reverse().slice(0, 2).join("/")}</span><DeleteSessionButton id={s.id} /></span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card>
          <SectionTitle eyebrow="Saúde · últimos 14 dias" />
          {health.data?.length ? (
            <table className="w-full text-left text-[12.5px]">
              <thead className="label">
                <tr>
                  <th className="pb-2 font-normal">Dia</th>
                  <th className="pb-2 font-normal">Sono</th>
                  <th className="pb-2 font-normal">Passos</th>
                  <th className="pb-2 font-normal">Treino</th>
                  <th className="pb-2 font-normal">FC rep.</th>
                </tr>
              </thead>
              <tbody className="text-text-2">
                {health.data.map((h) => (
                  <tr key={h.day} className="border-t border-line">
                    <td className="py-1.5">{h.day.split("-").reverse().slice(0, 2).join("/")}</td>
                    <td>{hm(h.sleep_minutes)}</td>
                    <td>{h.steps?.toLocaleString("pt-BR") ?? "–"}</td>
                    <td>{h.workout_minutes ? `${h.workout_minutes} min` : "–"}</td>
                    <td>{h.resting_hr ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[13.5px] leading-relaxed text-text-3">
              Sem dados de saúde ainda. O Apple Saúde não tem API web; configure o Atalho do iPhone em Ajustes → Saúde para enviar agregados
              diários (sono, passos, treinos). Só leitura, nunca amostras brutas.
            </p>
          )}
        </Card>

        <Card>
          <SectionTitle eyebrow="Registros diários" />
          {checkins.data?.length ? (
            <ul className="space-y-2.5">
              {checkins.data.map((c) => (
                <li key={c.day} className="text-[13.5px]">
                  <span className="label mr-3">{c.day.split("-").reverse().slice(0, 2).join("/")}</span>
                  <span className="text-text-2">
                    energia {c.energy ?? "–"} · humor {c.mood ?? "–"} · sono {c.sleep_quality ?? "–"}
                  </span>
                  {c.note && <div className="mt-0.5 pl-[52px] text-text-3">{c.note}</div>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13.5px] text-text-3">Use o registro rápido no Ambiente. Três toques por dia bastam.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
