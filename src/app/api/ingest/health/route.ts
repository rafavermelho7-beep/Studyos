import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/env";
import { healthPayloadSchema, normalizeHealthDays } from "@/lib/health/ingest";

// Endpoint para os Atalhos do iOS. Autenticação por token próprio (Bearer),
// validado dentro do banco (função security definer). Não usa a service role key.
export async function POST(req: Request) {
  const cfg = supabaseConfig();
  if (!cfg) return Response.json({ error: "not configured" }, { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token.length < 32 || token.length > 200) return Response.json({ error: "unauthorized" }, { status: 401 });

  const raw = await req.text();
  if (raw.length > 200_000) return Response.json({ error: "payload too large" }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = healthPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "invalid payload", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }

  const supabase = createClient(cfg.url, cfg.key, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("ingest_health_daily", {
    p_token: token,
    p_rows: normalizeHealthDays(parsed.data.days),
  });
  if (error) {
    const unauthorized = /invalid token/.test(error.message);
    return Response.json({ error: unauthorized ? "unauthorized" : "ingest failed" }, { status: unauthorized ? 401 : 400 });
  }
  return Response.json({ ok: true, rows: data });
}
