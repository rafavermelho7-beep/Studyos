import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/env";

/** Cliente Supabase por requisição, com a sessão do usuário (RLS aplicada). */
export async function createClient() {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase não configurado");
  const cookieStore = await cookies();
  return createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component: o proxy já renova a sessão.
        }
      },
    },
  });
}

export type Supabase = Awaited<ReturnType<typeof createClient>>;
