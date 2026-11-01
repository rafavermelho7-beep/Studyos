import { requireOwner } from "@/lib/auth";
import { createDecision, createGoal, createProject } from "@/app/actions";
import { ActionForm, Card, DomainSelect, Field, SectionTitle } from "@/components/ui";
import { GoalRow, ProjectRow } from "./rows";

export const metadata = { title: "Objetivos · LIFE ENGINE" };

const HORIZON: Record<string, string> = { quarter: "Este trimestre", year: "Este ano", multi_year: "1 a 3 anos" };

export default async function GoalsPage() {
  const { supabase } = await requireOwner();
  const [goals, projects, decisions] = await Promise.all([
    supabase.from("goals").select("*").in("status", ["active", "paused", "draft"]).order("created_at"),
    supabase.from("projects").select("*").in("status", ["active", "planned", "paused"]).order("created_at"),
    supabase.from("life_decisions").select("*").order("created_at", { ascending: false }).limit(10),
  ]);
  const goalList = goals.data ?? [];

  return (
    <div className="pt-8">
      <div className="mb-8">
        <div className="label mb-2">Direção</div>
        <h1 className="text-[28px] font-light tracking-tight">Objetivos, projetos e decisões</h1>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-text-3">
          O JARVIS usa isto para detectar conflitos, prazos concorrentes e domínios esquecidos. Ele pode propor novos itens nas conversas;
          só você os confirma.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {(["multi_year", "year", "quarter"] as const).map((h) => {
            const list = goalList.filter((g) => g.horizon === h);
            if (!list.length) return null;
            return (
              <Card key={h}>
                <SectionTitle eyebrow={HORIZON[h]} />
                <ul className="divide-y divide-line">
                  {list.map((g) => (
                    <GoalRow key={g.id} goal={g} />
                  ))}
                </ul>
              </Card>
            );
          })}
          {!goalList.length && (
            <Card>
              <p className="text-[14px] text-text-3">Nenhum objetivo ainda. Defina poucos e significativos — equilíbrio vale mais que volume.</p>
            </Card>
          )}

          <Card>
            <SectionTitle eyebrow="Projetos" />
            {projects.data?.length ? (
              <ul className="divide-y divide-line">
                {projects.data.map((p) => (
                  <ProjectRow key={p.id} project={p} goalTitle={goalList.find((g) => g.id === p.goal_id)?.title} />
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-text-3">Nenhum projeto ativo.</p>
            )}
          </Card>

          <Card>
            <SectionTitle eyebrow="Registro de decisões" />
            {decisions.data?.length ? (
              <ul className="space-y-4">
                {decisions.data.map((d) => (
                  <li key={d.id} className="border-l border-line-2 pl-4">
                    <div className="text-[14.5px] text-text">{d.title}</div>
                    {d.decision && <p className="mt-0.5 text-[13.5px] text-text-2">→ {d.decision}</p>}
                    {d.rationale && <p className="mt-0.5 text-[13px] text-text-3">{d.rationale}</p>}
                    <div className="label mt-1">
                      {d.decided_on ?? "sem data"}
                      {d.review_on ? ` · revisar em ${d.review_on}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-text-3">Registrar decisões importantes (contexto, opções, razão) permite revisá-las depois com honestidade.</p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionTitle eyebrow="Novo objetivo" />
            <ActionForm action={createGoal} submitLabel="Criar objetivo">
              <Field label="Objetivo">
                <input name="title" required maxLength={200} className="field" placeholder="Ex.: Conseguir estágio em pesquisa" />
              </Field>
              <Field label="Por que importa">
                <textarea name="why" rows={2} maxLength={1000} className="field" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Domínio">
                  <DomainSelect />
                </Field>
                <Field label="Horizonte">
                  <select name="horizon" defaultValue="year" className="field">
                    <option value="quarter">Trimestre</option>
                    <option value="year">Ano</option>
                    <option value="multi_year">1–3 anos</option>
                  </select>
                </Field>
              </div>
              <Field label="Prazo (opcional)">
                <input name="target_date" type="date" className="field" />
              </Field>
            </ActionForm>
          </Card>
          <Card>
            <SectionTitle eyebrow="Novo projeto" />
            <ActionForm action={createProject} submitLabel="Criar projeto">
              <Field label="Projeto">
                <input name="title" required maxLength={200} className="field" />
              </Field>
              <Field label="Objetivo relacionado">
                <select name="goal_id" className="field" defaultValue="">
                  <option value="">Nenhum</option>
                  {goalList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Próxima ação">
                <input name="next_action" maxLength={300} className="field" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Domínio">
                  <DomainSelect />
                </Field>
                <Field label="Prazo">
                  <input name="due_date" type="date" className="field" />
                </Field>
              </div>
            </ActionForm>
          </Card>
          <Card>
            <SectionTitle eyebrow="Registrar decisão" />
            <ActionForm action={createDecision} submitLabel="Registrar">
              <Field label="Decisão sobre">
                <input name="title" required maxLength={200} className="field" />
              </Field>
              <Field label="Opções consideradas">
                <textarea name="options" rows={2} className="field" />
              </Field>
              <Field label="O que foi decidido">
                <input name="decision" className="field" />
              </Field>
              <Field label="Razão">
                <textarea name="rationale" rows={2} className="field" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Decidido em">
                  <input name="decided_on" type="date" className="field" />
                </Field>
                <Field label="Revisar em">
                  <input name="review_on" type="date" className="field" />
                </Field>
              </div>
            </ActionForm>
          </Card>
        </div>
      </div>
    </div>
  );
}
