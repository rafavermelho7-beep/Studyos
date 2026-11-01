import "server-only";
// Aplica a extração pós-conversa: valida, consulta a matriz de permissões e grava
// memórias (automáticas) e propostas (aguardam confirmação). Tudo auditado.

import type { Supabase } from "@/lib/supabase/server";
import { audit } from "@/lib/governance/audit";
import { decideMemory, MAX_MEMORIES_PER_TURN } from "@/lib/memory/policy";
import type { Extraction } from "@/lib/intelligence/extraction";

export interface AppliedExtraction {
  memories: { id: string; content: string; status: string; kind: string }[];
  proposals: { id: string; type: string; title: string }[];
  skipped: number;
}

export async function applyExtraction(
  supabase: Supabase,
  ex: Extraction,
  ctx: { spaceId: string; messageId: string; existingTexts: string[]; renameSpace: boolean },
): Promise<AppliedExtraction> {
  const out: AppliedExtraction = { memories: [], proposals: [], skipped: 0 };
  const known = [...ctx.existingTexts];

  for (const c of ex.memories.slice(0, MAX_MEMORIES_PER_TURN)) {
    const d = decideMemory(c, known);
    if (d.action === "skip") {
      out.skipped++;
      continue;
    }
    const { data, error } = await supabase
      .from("memories")
      .insert({
        kind: d.kind,
        content: c.content,
        domain: c.domain ?? null,
        sensitivity: c.sensitivity,
        status: d.status,
        confidence: d.confidence,
        source: d.source,
        source_ref: { space_id: ctx.spaceId, message_id: ctx.messageId },
      })
      .select("id, content, status, kind")
      .single();
    if (error || !data) {
      console.error("[memory] falha ao gravar", error?.message);
      continue;
    }
    known.push(c.content);
    out.memories.push(data);
    await audit(supabase, "agent", d.status === "active" ? "memory.save" : "memory.propose", "memory", data.id, {
      reason: d.reason,
      kind: d.kind,
    });
  }

  for (const p of ex.proposals) {
    // Evento sem data válida não vira proposta (evita botão "Aceitar" que falharia).
    if (p.type === "create_calendar_event" && !p.start) continue;
    const { data, error } = await supabase
      .from("proposals")
      .insert({
        type: p.type,
        payload: {
          title: p.title,
          description: p.description,
          domain: p.domain ?? null,
          why: p.why,
          horizon: p.horizon ?? null,
          ...(p.type === "create_calendar_event" ? { start: p.start ?? null, duration_minutes: p.duration_minutes ?? null } : {}),
        },
        rationale: p.rationale,
        space_id: ctx.spaceId,
      })
      .select("id, type")
      .single();
    if (error || !data) continue;
    out.proposals.push({ id: data.id, type: data.type, title: p.title });
    await audit(supabase, "agent", "proposal.create", "proposal", data.id, { type: p.type });
  }

  if (ctx.renameSpace && ex.space_title) {
    await supabase.from("spaces").update({ title: ex.space_title.slice(0, 80) }).eq("id", ctx.spaceId).neq("kind", "ambient");
  }
  return out;
}
