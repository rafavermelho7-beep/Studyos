import { ownerOrNull } from "@/lib/auth";
import { audit } from "@/lib/governance/audit";

// Portabilidade (requisito de arquitetura): exporta todos os dados do usuário em JSON.
const TABLES = [
  "profiles", "memories", "goals", "projects", "life_decisions", "spaces", "messages", "checkins",
  "domain_ratings", "study_events", "health_daily", "insights", "syntheses", "proposals", "ai_usage", "audit_log",
] as const;

export async function GET() {
  const session = await ownerOrNull();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { supabase } = session;
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), format: "life-engine-export/1" };
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select("*").limit(50_000);
    out[t] = error ? { error: error.message } : data;
  }
  await audit(supabase, "user", "data.export", "all");
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="life-engine-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
