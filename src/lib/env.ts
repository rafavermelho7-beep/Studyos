// Leitura centralizada de variáveis de ambiente. Nunca expõe segredos ao cliente:
// apenas NEXT_PUBLIC_* chegam ao navegador.

export function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/** E-mail do único usuário autorizado (DEC-027). Comparação sem caixa. */
export function ownerEmail(): string | null {
  const v = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return v ? v : null;
}

export function isOwner(email: string | null | undefined): boolean {
  const owner = ownerEmail();
  return !!owner && !!email && email.trim().toLowerCase() === owner;
}

export function aiKeys() {
  return {
    anthropic: process.env.ANTHROPIC_API_KEY?.trim() || null,
    openai: process.env.OPENAI_API_KEY?.trim() || null,
  };
}

export function setupIssues(): string[] {
  const issues: string[] = [];
  if (!supabaseConfig()) issues.push("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausentes");
  if (!ownerEmail()) issues.push("OWNER_EMAIL ausente (define o único usuário autorizado)");
  return issues;
}
