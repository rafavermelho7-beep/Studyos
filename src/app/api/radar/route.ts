import { z } from "zod";
import { ownerOrNull } from "@/lib/auth";
import { runRadar } from "@/lib/services/radar";

export const maxDuration = 120;

const bodySchema = z.object({ trigger: z.enum(["auto", "manual"]) });

export async function POST(req: Request) {
  const session = await ownerOrNull();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Requisição inválida." }, { status: 400 });
  const r = await runRadar(session.supabase, session.owner, parsed.data.trigger);
  return Response.json(r, { status: r.ok ? 200 : 429 });
}
