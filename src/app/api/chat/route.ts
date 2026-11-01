import { z } from "zod";
import { ownerOrNull } from "@/lib/auth";
import { runAI, AIUnavailableError } from "@/lib/ai/engine";
import { buildSystemPrompt, trimHistory } from "@/lib/intelligence/context";
import { EXTRACTION_SYSTEM, extractionJsonSchema, parseExtraction } from "@/lib/intelligence/extraction";
import { loadContext } from "@/lib/services/context-loader";
import { applyExtraction } from "@/lib/services/memory-writer";
import { getAmbientSpace, getSpace, listMessages } from "@/lib/services/spaces";
import type { ChatMessage } from "@/lib/ai/providers/types";

export const maxDuration = 60;

const bodySchema = z.object({
  spaceId: z.string().uuid().nullable().optional(),
  message: z.string().trim().min(1).max(8000),
});

// Protocolo: Server-Sent Events. Eventos: route, delta, done, memory, error.
export async function POST(req: Request) {
  const session = await ownerOrNull();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { supabase, owner } = session;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return Response.json({ error: "Mensagem inválida." }, { status: 400 });
  }

  const space = body.spaceId ? await getSpace(supabase, body.spaceId) : await getAmbientSpace(supabase);
  if (!space) return Response.json({ error: "Espaço não encontrado." }, { status: 404 });

  const { data: userMsg, error: insErr } = await supabase
    .from("messages")
    .insert({ space_id: space.id, role: "user", content: body.message })
    .select("id")
    .single();
  if (insErr || !userMsg) return Response.json({ error: "Falha ao salvar mensagem." }, { status: 500 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      try {
        const history = await listMessages(supabase, space.id, 30);
        const { input, memoryIds, memoryTexts } = await loadContext(supabase, owner, {
          query: body.message,
          space: { title: space.title, purpose: space.purpose, summary: space.summary, kind: space.kind },
        });
        const messages = trimHistory(
          history
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role as ChatMessage["role"], content: m.content })),
        );

        let full = "";
        const result = await runAI({
          supabase,
          timezone: owner.timezone,
          task: "chat",
          system: buildSystemPrompt(input),
          messages,
          userText: body.message,
          preferredProvider: owner.preferredProvider,
          signal: req.signal,
          onRoute: (r) => send("route", r),
          onText: (d) => {
            full += d;
            send("delta", { t: d });
          },
        });
        const text = result.text || full;

        const { data: asst } = await supabase
          .from("messages")
          .insert({
            space_id: space.id,
            role: "assistant",
            content: text || "(sem resposta)",
            model: result.model,
            meta: { tier: result.tier, cost_brl: result.costBRL, reason: result.decision.reason, memories_used: memoryIds.length },
          })
          .select("id")
          .single();
        send("done", { messageId: asst?.id, model: result.model, costBRL: result.costBRL, spaceId: space.id });

        if (memoryIds.length) {
          await supabase.from("memories").update({ last_used_at: new Date().toISOString() }).in("id", memoryIds);
        }

        // Extração de memória/propostas: falhas aqui nunca afetam a resposta.
        try {
          const ex = await runAI({
            supabase,
            timezone: owner.timezone,
            task: "extract",
            system: EXTRACTION_SYSTEM,
            messages: [
              {
                role: "user",
                content: `Título atual do espaço: "${space.title}"\n\n<conversa>\nUSUÁRIO: ${body.message}\n\nJARVIS: ${text}\n</conversa>`,
              },
            ],
            jsonSchema: extractionJsonSchema,
            preferredProvider: owner.preferredProvider,
          });
          const parsed = parseExtraction(ex.text);
          if (parsed) {
            const applied = await applyExtraction(supabase, parsed, {
              spaceId: space.id,
              messageId: userMsg.id,
              existingTexts: memoryTexts,
              renameSpace: history.length <= 2 && space.kind !== "ambient",
            });
            if (applied.memories.length || applied.proposals.length) send("memory", applied);
          }
        } catch (e) {
          console.error("[chat] extração falhou:", (e as Error).message);
        }
      } catch (e) {
        const message =
          e instanceof AIUnavailableError ? e.message : "Algo falhou ao gerar a resposta. Sua mensagem foi salva.";
        if (!(e instanceof AIUnavailableError)) console.error("[chat]", e);
        send("error", { message, code: e instanceof AIUnavailableError ? e.code : "internal" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
