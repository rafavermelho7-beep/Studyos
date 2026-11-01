import { z } from "zod";
import { ownerOrNull } from "@/lib/auth";
import { runAI, AIUnavailableError } from "@/lib/ai/engine";
import { buildSystemPrompt } from "@/lib/intelligence/context";
import { DAILY_INSTRUCTION, WEEKLY_INSTRUCTION } from "@/lib/intelligence/synthesis";
import { loadContext } from "@/lib/services/context-loader";
import { localDate, weekStart } from "@/lib/dates";
import { audit } from "@/lib/governance/audit";

export const maxDuration = 60;

const bodySchema = z.object({ kind: z.enum(["daily", "weekly"]), force: z.boolean().optional() });

/** Gera (uma vez por período) a síntese diária ou a revisão semanal. */
export async function POST(req: Request) {
  const session = await ownerOrNull();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { supabase, owner } = session;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Requisição inválida." }, { status: 400 });
  const { kind, force } = parsed.data;

  const today = localDate(new Date(), owner.timezone);
  const period = kind === "daily" ? today : weekStart(today);

  const { data: existing } = await supabase
    .from("syntheses")
    .select("content, model, created_at")
    .eq("kind", kind)
    .eq("period_start", period)
    .maybeSingle();
  if (existing && !force) return Response.json({ ...existing, cached: true });

  try {
    const { input } = await loadContext(supabase, owner, {
      query: kind === "daily" ? "hoje rotina energia sono provas objetivos" : "semana objetivos projetos equilíbrio decisões",
    });
    const result = await runAI({
      supabase,
      timezone: owner.timezone,
      task: kind === "daily" ? "daily_synthesis" : "weekly_review",
      system: buildSystemPrompt(input),
      messages: [{ role: "user", content: kind === "daily" ? DAILY_INSTRUCTION : WEEKLY_INSTRUCTION }],
      preferredProvider: owner.preferredProvider,
      signal: req.signal,
    });
    const row = { kind, period_start: period, content: result.text.trim(), model: result.model };
    const { error } = await supabase.from("syntheses").upsert(row, { onConflict: "user_id,kind,period_start" });
    if (error) throw new Error(error.message);
    await audit(supabase, "agent", "synthesis.generate", "synthesis", null, { kind, period, model: result.model });
    return Response.json({ ...row, cached: false, costBRL: result.costBRL });
  } catch (e) {
    if (e instanceof AIUnavailableError) return Response.json({ error: e.message, code: e.code }, { status: 503 });
    console.error("[synthesis]", e);
    return Response.json({ error: "Falha ao gerar a síntese." }, { status: 500 });
  }
}
