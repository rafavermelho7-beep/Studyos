import "server-only";
import type { Supabase } from "@/lib/supabase/server";

export type Actor = "user" | "agent" | "system";

/** Registra ação na auditoria append-only. Falhas de auditoria não derrubam a ação. */
export async function audit(
  supabase: Supabase,
  actor: Actor,
  action: string,
  entity: string,
  entityId?: string | null,
  detail: Record<string, unknown> = {},
) {
  const { error } = await supabase
    .from("audit_log")
    .insert({ actor, action, entity, entity_id: entityId ?? null, detail });
  if (error) console.error("[audit] falha ao registrar", action, entity, error.message);
}
