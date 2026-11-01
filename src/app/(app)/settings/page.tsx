import { requireOwner } from "@/lib/auth";
import { availableProviders } from "@/lib/ai/engine";
import { AGENT_ACTIONS } from "@/lib/governance/permissions";
import { MODEL_CATALOG } from "@/lib/ai/pricing";
import { saveProfile, signOut } from "@/app/actions";
import { ActionForm, Badge, Card, Field, SectionTitle } from "@/components/ui";
import { TokenManager } from "./token-manager";
import { CalendarCard } from "./calendar-card";
import { calendarStatus } from "@/lib/services/calendar";

export const metadata = { title: "Ajustes · LIFE ENGINE" };

const ACTION_LABEL: Record<string, string> = {
  create_insight: "Criar avisos",
  save_stated_memory: "Guardar o que você declarou",
  save_hypothesis: "Registrar hipóteses (revisáveis)",
  title_space: "Nomear espaços",
  summarize_space: "Resumir espaços",
  generate_synthesis: "Gerar síntese/revisão",
  save_sensitive_memory: "Guardar dado sensível",
  create_goal: "Criar objetivo",
  create_project: "Criar projeto",
  record_decision: "Registrar decisão",
  update_goal_status: "Mudar status de objetivo",
  promote_hypothesis_to_fact: "Promover hipótese a fato",
  write_calendar: "Criar evento na Google Agenda",
  save_restricted_memory: "Guardar dado restrito",
  delete_user_data: "Apagar seus dados",
  external_message: "Enviar mensagens externas",
  external_account_action: "Operar contas externas",
  payment: "Pagamentos",
  modify_permissions: "Alterar as próprias permissões",
  modify_budget: "Alterar o orçamento",
  read_secrets: "Ler chaves/segredos",
  alter_audit_log: "Alterar auditoria",
  web_browse: "Pesquisar na web (Fase 1: desligado)",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const { google } = await searchParams;
  const { supabase, owner } = await requireOwner();
  const calStatus = await calendarStatus(supabase);
  const [{ data: tokens }, { data: auditRows }] = await Promise.all([
    supabase.from("ingest_tokens").select("id, name, created_at, last_used_at, revoked_at").order("created_at", { ascending: false }),
    supabase.from("audit_log").select("created_at, actor, action, entity").order("created_at", { ascending: false }).limit(15),
  ]);
  const providers = availableProviders();
  const groups = { auto: [] as string[], confirm: [] as string[], forbidden: [] as string[] };
  for (const [k, v] of Object.entries(AGENT_ACTIONS)) groups[v].push(k);

  return (
    <div className="pt-8">
      <div className="mb-8">
        <div className="label mb-2">Ajustes e governança</div>
        <h1 className="text-[28px] font-light tracking-tight">Controle</h1>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle eyebrow="Perfil" />
          <ActionForm action={saveProfile} resetOnSuccess={false}>
            <Field label="Como o JARVIS deve te chamar">
              <input name="display_name" defaultValue={owner.displayName} maxLength={80} className="field" />
            </Field>
            <Field label="Fuso horário">
              <input name="timezone" defaultValue={owner.timezone} className="field" />
            </Field>
            <Field label="Provedor de IA preferido" hint="O roteador escolhe o modelo pelo tipo de tarefa e pelo orçamento; aqui você define só a preferência de provedor.">
              <select name="preferred_provider" defaultValue={owner.preferredProvider ?? ""} className="field">
                <option value="">Automático (Anthropic, depois OpenAI)</option>
                <option value="anthropic" disabled={!providers.anthropic}>Anthropic{providers.anthropic ? "" : " — sem chave"}</option>
                <option value="openai" disabled={!providers.openai}>OpenAI{providers.openai ? "" : " — sem chave"}</option>
              </select>
            </Field>
          </ActionForm>
          <div className="mt-6 border-t border-line pt-4 text-[13px] text-text-3">
            Conectado como {owner.email}
            <form action={signOut} className="mt-3">
              <button className="label hover:text-text-2">Sair</button>
            </form>
          </div>
        </Card>

        <Card>
          <SectionTitle eyebrow="Modelos disponíveis ao roteador" />
          <ul className="space-y-2 text-[13px]">
            {MODEL_CATALOG.map((m) => {
              const on = providers[m.provider];
              return (
                <li key={m.id} className={`flex items-center justify-between gap-2 ${on ? "text-text-2" : "text-text-3/60"}`}>
                  <span>
                    {m.label} <span className="label ml-1">{m.tier === "light" ? "leve" : m.tier === "standard" ? "padrão" : "profundo"}</span>
                  </span>
                  <span className="font-mono text-[11.5px]">
                    US${m.inputPerMTok} / US${m.outputPerMTok} {!m.verified && <Badge tone="warm">confirmar</Badge>}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[12px] text-text-3">Preço por milhão de tokens (entrada / saída). Chaves de API ficam só no servidor e nunca são exibidas.</p>
        </Card>

        <Card>
          <SectionTitle eyebrow="Google Agenda" />
          <CalendarCard status={calStatus} flash={google} />
        </Card>

        <Card>
          <SectionTitle eyebrow="Saúde · Atalho do iPhone" />
          <TokenManager tokens={tokens ?? []} />
        </Card>

        <Card>
          <SectionTitle eyebrow="Matriz de permissões do JARVIS" />
          {(["auto", "confirm", "forbidden"] as const).map((g) => (
            <div key={g} className="mb-4 last:mb-0">
              <div className="mb-2">
                <Badge tone={g === "auto" ? "ok" : g === "confirm" ? "warm" : "danger"}>
                  {g === "auto" ? "automático (reversível)" : g === "confirm" ? "exige sua confirmação" : "proibido"}
                </Badge>
              </div>
              <p className="text-[13px] leading-relaxed text-text-3">{groups[g].map((k) => ACTION_LABEL[k] ?? k).join(" · ")}</p>
            </div>
          ))}
          <p className="mt-2 text-[12px] text-text-3">A matriz está no código do servidor; o JARVIS não pode alterá-la.</p>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle eyebrow="Auditoria recente" />
          {auditRows?.length ? (
            <ul className="space-y-1.5 font-mono text-[11.5px] text-text-3">
              {auditRows.map((a, i) => (
                <li key={i}>
                  {new Date(a.created_at).toLocaleString("pt-BR", { timeZone: owner.timezone })} ·{" "}
                  <span className={a.actor === "agent" ? "text-[hsl(262_80%_78%)]" : "text-text-2"}>{a.actor}</span> · {a.action} · {a.entity}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-text-3">Sem registros.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
