import { requireOwner } from "@/lib/auth";
import { availableProviders, loadBudget } from "@/lib/ai/engine";
import { calendarStatus } from "@/lib/services/calendar";
import { lastRadarRun } from "@/lib/services/radar";
import { radarSettings } from "@/lib/radar/radar";
import { saveRadarSettings } from "@/app/actions";
import { ActionForm, Card, Field, SectionTitle } from "@/components/ui";
import { OpportunityCard, type OpportunityRow } from "@/components/opportunity-card";
import { RadarTrigger } from "@/components/radar-trigger";

export const metadata = { title: "Radar · LIFE ENGINE" };

export default async function RadarPage() {
  const { supabase, owner } = await requireOwner();
  const [opps, profile, last, cal, budget] = await Promise.all([
    supabase.from("opportunities").select("*").neq("status", "dismissed").order("found_at", { ascending: false }).limit(60),
    supabase.from("profiles").select("settings").eq("id", owner.id).single(),
    lastRadarRun(supabase),
    calendarStatus(supabase),
    loadBudget(supabase, owner.timezone),
  ]);
  const settings = radarSettings(profile.data?.settings);
  const list = (opps.data ?? []) as OpportunityRow[];
  const available = availableProviders().anthropic && (budget.mode === "normal" || budget.mode === "economy");
  const connected = cal.state === "connected";
  const groups = [
    { key: "new", label: "Novas", items: list.filter((o) => o.status === "new") },
    { key: "saved", label: "Salvas", items: list.filter((o) => o.status === "saved") },
    { key: "scheduled", label: "Na agenda", items: list.filter((o) => o.status === "scheduled") },
  ];

  return (
    <div className="pt-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label mb-2">Opportunity Radar</div>
          <h1 className="text-[28px] font-light tracking-tight">Oportunidades para você</h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-text-3">
            O JARVIS pesquisa na web uma vez por semana (ou quando você pedir), prioriza fontes oficiais e só mostra itens cujo link
            apareceu de fato na busca. Cada busca custa cerca de R$0,50–1,00 do orçamento de IA.
          </p>
        </div>
        <div className="text-right">
          <RadarTrigger auto={false} available={available} />
          <div className="label mt-1 normal-case tracking-normal">
            {last ? `Última busca: ${new Date(last.created_at).toLocaleString("pt-BR", { timeZone: owner.timezone })}${last.status === "error" ? " (falhou)" : ""}` : "Nenhuma busca ainda"}
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {groups.map((g) =>
            g.items.length || g.key === "new" ? (
              <Card key={g.key}>
                <SectionTitle eyebrow={g.label} action={<span className="label">{g.items.length}</span>} />
                {g.items.length ? (
                  <ul className="space-y-3">
                    {g.items.map((o) => (
                      <OpportunityCard key={o.id} o={o} calendarConnected={connected} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-[14px] text-text-3">Nada novo. Ajuste interesses e cidade ao lado para melhorar a pesquisa.</p>
                )}
              </Card>
            ) : null,
          )}
        </div>
        <Card className="h-fit">
          <SectionTitle eyebrow="O que procurar" />
          <ActionForm action={saveRadarSettings} submitLabel="Salvar" resetOnSuccess={false}>
            <fieldset className="space-y-2">
              <legend className="label mb-1.5">Categorias</legend>
              <label className="flex items-center gap-2 text-[14px] text-text-2">
                <input type="checkbox" name="cat_cursos_eventos" defaultChecked={settings.categories.includes("cursos_eventos")} /> Cursos e eventos
              </label>
              <label className="flex items-center gap-2 text-[14px] text-text-2">
                <input type="checkbox" name="cat_experiencias" defaultChecked={settings.categories.includes("experiencias")} /> Experiências
              </label>
            </fieldset>
            <Field label="Cidade">
              <input name="city" defaultValue={settings.city} maxLength={80} placeholder="Ex.: São Paulo" className="field" />
            </Field>
            <Field label="Interesses" hint="Temas, áreas, hobbies. Quanto mais específico, melhor a pesquisa.">
              <textarea name="interests" defaultValue={settings.interests} rows={3} maxLength={500} placeholder="Ex.: programação, ciência de dados, trilhas, música ao vivo" className="field" />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
