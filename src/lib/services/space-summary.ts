import "server-only";
import type { Supabase } from "@/lib/supabase/server";
import { runAI } from "@/lib/ai/engine";
import { audit } from "@/lib/governance/audit";
import { SUMMARY_EVERY, SUMMARY_SYSTEM } from "@/lib/intelligence/summary";
import type { Owner } from "@/lib/auth";

/** Atualiza o resumo do espaço quando há ≥10 mensagens novas desde o último. Modelo leve. */
export async function maybeSummarizeSpace(supabase: Supabase, owner: Owner, spaceId: string): Promise<boolean> {
  const { data: space } = await supabase.from("spaces").select("summary, summary_msg_count").eq("id", spaceId).single();
  if (!space) return false;
  const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("space_id", spaceId);
  const total = count ?? 0;
  if (total - space.summary_msg_count < SUMMARY_EVERY) return false;
  const { data: msgs } = await supabase
    .from("messages")
    .select("role, content")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: true })
    .range(space.summary_msg_count, total - 1);
  const transcript = (msgs ?? [])
    .filter((m) => m.role !== "note")
    .map((m) => `${m.role === "user" ? "USUÁRIO" : "JARVIS"}: ${m.content.slice(0, 1500)}`)
    .join("\n\n")
    .slice(-24_000);
  const r = await runAI({
    supabase,
    timezone: owner.timezone,
    task: "summarize",
    system: SUMMARY_SYSTEM,
    messages: [{ role: "user", content: `RESUMO ANTERIOR:\n${space.summary || "(vazio)"}\n\n<mensagens_novas>\n${transcript}\n</mensagens_novas>` }],
    preferredProvider: owner.preferredProvider,
  });
  const summary = r.text.trim().slice(0, 1500);
  if (!summary) return false;
  await supabase
    .from("spaces")
    .update({ summary, summary_msg_count: total, summary_updated_at: new Date().toISOString() })
    .eq("id", spaceId);
  await audit(supabase, "agent", "space.summarize", "space", spaceId, { messages: total });
  return true;
}
