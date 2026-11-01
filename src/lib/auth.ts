import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/env";

export interface Owner {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  preferredProvider: "anthropic" | "openai" | null;
}

/**
 * Camada de acesso (DAL): valida a sessão no servidor do Supabase (getUser, não
 * getSession) e confirma que é o único dono autorizado. Use em toda página, action
 * e rota que toca dados.
 */
export const requireOwner = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !isOwner(data.user.email)) {
    redirect("/login");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone, preferred_provider")
    .eq("id", data.user.id)
    .maybeSingle();
  const owner: Owner = {
    id: data.user.id,
    email: data.user.email!,
    displayName: profile?.display_name || "",
    timezone: profile?.timezone || "America/Sao_Paulo",
    preferredProvider: (profile?.preferred_provider as Owner["preferredProvider"]) ?? null,
  };
  return { supabase, owner };
});

/** Variante para rotas de API: retorna null em vez de redirecionar. */
export async function ownerOrNull() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || !isOwner(data.user.email)) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone, preferred_provider")
    .eq("id", data.user.id)
    .maybeSingle();
  const owner: Owner = {
    id: data.user.id,
    email: data.user.email!,
    displayName: profile?.display_name || "",
    timezone: profile?.timezone || "America/Sao_Paulo",
    preferredProvider: (profile?.preferred_provider as Owner["preferredProvider"]) ?? null,
  };
  return { supabase, owner };
}
