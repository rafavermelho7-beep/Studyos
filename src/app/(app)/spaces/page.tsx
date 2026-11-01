import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { domainLabel } from "@/lib/domains";
import { createSpace } from "@/app/actions";
import { ActionForm, Card, DomainSelect, Field, SectionTitle } from "@/components/ui";
import { GuidedSpaces } from "./guided";

export const metadata = { title: "Espaços · LIFE ENGINE" };

function ago(iso: string) {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return d <= 0 ? "hoje" : d === 1 ? "ontem" : `há ${d} dias`;
}

export default async function SpacesPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const { archived } = await searchParams;
  const { supabase } = await requireOwner();
  const { data: spaces } = await supabase
    .from("spaces")
    .select("id, title, purpose, domain, kind, pinned, last_activity_at, status")
    .neq("kind", "ambient")
    .eq("status", archived ? "archived" : "active")
    .order("pinned", { ascending: false })
    .order("last_activity_at", { ascending: false });

  return (
    <div className="pt-8">
      <div className="mb-8">
        <div className="label mb-2">Intelligence Spaces</div>
        <h1 className="text-[28px] font-light tracking-tight">Espaços de investigação</h1>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-text-3">
          Cada espaço preserva contexto e histórico de uma questão — uma decisão de carreira, um problema de saúde, um projeto. Você pode
          sair e retomar quando quiser; o JARVIS lembra onde parou.
        </p>
      </div>
      {!archived && <GuidedSpaces />}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-3 sm:grid-cols-2">
          {spaces?.length ? (
            spaces.map((s) => (
              <Link key={s.id} href={`/spaces/${s.id}`} className="glass group rise block rounded-3xl p-5 transition-colors hover:border-line-2">
                <div className="mb-3 flex items-center gap-2">
                  {s.pinned && <span className="h-1.5 w-1.5 rounded-full bg-signal" title="Fixado" />}
                  <span className="label">{s.domain ? domainLabel(s.domain) : "Investigação"}</span>
                  <span className="label ml-auto">{ago(s.last_activity_at)}</span>
                </div>
                <div className="text-[16px] text-text group-hover:text-white">{s.title}</div>
                {s.purpose && <p className="mt-1.5 line-clamp-2 text-[13.5px] text-text-3">{s.purpose}</p>}
              </Link>
            ))
          ) : (
            <p className="text-[14px] text-text-3 sm:col-span-2">{archived ? "Nenhum espaço arquivado." : "Nenhum espaço ainda. Crie o primeiro ao lado."}</p>
          )}
          <Link href={archived ? "/spaces" : "/spaces?archived=1"} className="label mt-2 hover:text-text-2 sm:col-span-2">
            {archived ? "← Espaços ativos" : "Ver arquivados"}
          </Link>
        </div>
        <Card className="h-fit">
          <SectionTitle eyebrow="Novo espaço" />
          <ActionForm action={createSpace} submitLabel="Abrir espaço">
            <Field label="Questão">
              <input name="title" required maxLength={160} placeholder="Ex.: Mestrado ou mercado em 2027?" className="field" />
            </Field>
            <Field label="Propósito (opcional)">
              <textarea name="purpose" rows={2} maxLength={500} placeholder="O que você quer entender ou decidir?" className="field" />
            </Field>
            <Field label="Domínio">
              <DomainSelect />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
