import "server-only";
import type { Supabase } from "@/lib/supabase/server";

export interface SpaceRow {
  id: string;
  title: string;
  kind: string;
  purpose: string;
  summary: string;
  domain: string | null;
  status: string;
  pinned: boolean;
  last_activity_at: string;
}

const COLS = "id, title, kind, purpose, summary, domain, status, pinned, last_activity_at";

/** Espaço "ambiente": a conversa contínua da tela principal. Criado sob demanda. */
export async function getAmbientSpace(supabase: Supabase): Promise<SpaceRow> {
  const { data } = await supabase.from("spaces").select(COLS).eq("kind", "ambient").maybeSingle();
  if (data) return data;
  const { data: created, error } = await supabase
    .from("spaces")
    .insert({ title: "Ambiente", kind: "ambient", purpose: "Conversa contínua com o JARVIS" })
    .select(COLS)
    .single();
  if (error || !created) {
    // corrida: outro request criou primeiro
    const { data: again } = await supabase.from("spaces").select(COLS).eq("kind", "ambient").single();
    if (again) return again;
    throw new Error("Não foi possível criar o espaço ambiente: " + error?.message);
  }
  return created;
}

export async function getSpace(supabase: Supabase, id: string): Promise<SpaceRow | null> {
  const { data } = await supabase.from("spaces").select(COLS).eq("id", id).maybeSingle();
  return data ?? null;
}

export async function listMessages(supabase: Supabase, spaceId: string, limit = 60) {
  const { data } = await supabase
    .from("messages")
    .select("id, role, content, model, meta, created_at")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).reverse();
}
