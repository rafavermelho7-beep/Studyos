import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { addMemory } from "@/app/actions";
import { ActionForm, Card, DomainSelect, Field, SectionTitle } from "@/components/ui";
import { MemoryItem, type MemoryRow } from "./memory-item";

export const metadata = { title: "Memória · LIFE ENGINE" };

const TABS = [
  { key: "active", label: "Ativas" },
  { key: "review", label: "A revisar" },
  { key: "archive", label: "Arquivo" },
] as const;

export default async function MemoryPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab = "active", q } = await searchParams;
  const { supabase } = await requireOwner();
  let query = supabase
    .from("memories")
    .select("id, kind, content, domain, sensitivity, status, confidence, source, pinned, valid_until, created_at, updated_at, last_used_at")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(200);
  if (tab === "review") query = query.or("status.eq.proposed,and(status.eq.active,kind.in.(hypothesis,inference))");
  else if (tab === "archive") query = query.in("status", ["outdated", "rejected", "archived"]);
  else query = query.eq("status", "active").not("kind", "in", "(hypothesis,inference)");
  if (q) query = query.textSearch("fts", q, { type: "websearch", config: "portuguese" });
  const [{ data: memories }, counts] = await Promise.all([
    query,
    supabase.from("memories").select("status, kind"),
  ]);
  const all = counts.data ?? [];
  const n = {
    active: all.filter((m) => m.status === "active" && !["hypothesis", "inference"].includes(m.kind)).length,
    review: all.filter((m) => m.status === "proposed" || (m.status === "active" && ["hypothesis", "inference"].includes(m.kind))).length,
    archive: all.filter((m) => ["outdated", "rejected", "archived"].includes(m.status)).length,
  };

  return (
    <div className="pt-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label mb-2">Identidade e memória</div>
          <h1 className="text-[28px] font-light tracking-tight">O que o JARVIS sabe sobre você</h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-text-3">
            Cada memória tem tipo, origem e confiança. Hipóteses são inferências do JARVIS — nunca fatos até você confirmar. Você pode
            corrigir, marcar como desatualizada ou excluir qualquer item.
          </p>
        </div>
        <a href="/api/export" className="label rounded-full border border-line px-4 py-2 hover:text-text-2">
          Exportar todos os dados (JSON)
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={`/memory?tab=${t.key}`}
                className={`rounded-full px-3.5 py-1.5 text-[13px] ${tab === t.key ? "bg-white/[0.08] text-text" : "text-text-3 hover:text-text-2"}`}
              >
                {t.label} <span className="text-text-3">{n[t.key]}</span>
              </Link>
            ))}
            <form className="ml-auto" action="/memory">
              <input type="hidden" name="tab" value={tab} />
              <input name="q" defaultValue={q} placeholder="Buscar…" className="field h-8 w-44 py-1 text-[13px]" />
            </form>
          </div>
          <Card>
            {memories?.length ? (
              <ul className="divide-y divide-line">
                {(memories as MemoryRow[]).map((m) => (
                  <MemoryItem key={m.id} m={m} />
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-text-3">
                {tab === "review" ? "Nada aguardando revisão." : tab === "archive" ? "Arquivo vazio." : "Nenhuma memória ainda. Elas surgem das conversas ou podem ser registradas ao lado."}
              </p>
            )}
          </Card>
        </div>
        <Card className="h-fit">
          <SectionTitle eyebrow="Registrar manualmente" />
          <ActionForm action={addMemory} submitLabel="Registrar">
            <Field label="O que lembrar">
              <textarea name="content" required rows={3} maxLength={2000} className="field" placeholder="Ex.: Meu valor central é autonomia." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select name="kind" className="field" defaultValue="fact">
                  <option value="fact">Fato</option>
                  <option value="preference">Preferência</option>
                  <option value="value">Valor</option>
                  <option value="belief">Crença</option>
                  <option value="event">Acontecimento</option>
                  <option value="context">Contexto</option>
                </select>
              </Field>
              <Field label="Domínio">
                <DomainSelect />
              </Field>
            </div>
            <Field label="Sensibilidade" hint="Restrito: nunca é enviado à IA na nuvem.">
              <select name="sensitivity" className="field" defaultValue="normal">
                <option value="normal">Normal</option>
                <option value="sensitive">Sensível</option>
                <option value="restricted">Restrito</option>
              </select>
            </Field>
            <Field label="Válido até (opcional)">
              <input name="valid_until" type="date" className="field" />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
