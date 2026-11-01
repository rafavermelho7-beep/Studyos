import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, GenerateParams, GenerateResult } from "./types";
import { ProviderError } from "./types";

export function createAnthropicProvider(apiKey: string): AIProvider {
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 90_000 });

  return {
    name: "anthropic",
    async generate(p: GenerateParams, onText?: (d: string) => void): Promise<GenerateResult> {
      // Haiku 5.5 aceita desligar o raciocínio (esforço <= high); Sonnet 5.5 usa
      // "between_tools"; Opus 5.5 não permite desligar — controlado só por esforço.
      let thinking: Anthropic.Messages.MessageStreamParams["thinking"] | undefined;
      if (p.minimalReasoning) {
        if (p.model.id.startsWith("claude-haiku")) thinking = { type: "disabled" };
        else if (p.model.id.startsWith("claude-sonnet"))
          thinking = { type: "between_tools" } as unknown as typeof thinking;
      }
      const tools: Anthropic.Messages.ToolUnion[] | undefined = p.webSearch
        ? [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: p.webSearch.maxUses,
              ...(p.webSearch.city
                ? { user_location: { type: "approximate" as const, city: p.webSearch.city, country: "BR", timezone: p.webSearch.timezone ?? null } }
                : {}),
            },
          ]
        : undefined;
      try {
        let messages: Anthropic.Messages.MessageParam[] = p.messages.map((m) => ({ role: m.role, content: m.content }));
        let msg: Anthropic.Messages.Message | null = null;
        const sources = new Map<string, string>();
        let searches = 0;
        let inTok = 0;
        let outTok = 0;
        let cachedTok = 0;
        const textParts: string[] = [];
        // pause_turn: o laço do servidor parou; reenviamos para continuar (no máx. 2x).
        for (let round = 0; round < 3; round++) {
          const stream = client.messages.stream(
            {
              model: p.model.id,
              max_tokens: p.maxOutputTokens,
              // Prompt de sistema estável primeiro => elegível a cache de prefixo.
              system: [{ type: "text", text: p.system, cache_control: { type: "ephemeral" } }],
              messages,
              output_config: {
                effort: p.effort,
                ...(p.jsonSchema ? { format: { type: "json_schema", schema: p.jsonSchema } } : {}),
              },
              ...(thinking ? { thinking } : {}),
              ...(tools ? { tools } : {}),
            },
            { signal: p.signal },
          );
          if (onText) stream.on("text", (delta) => onText(delta));
          msg = await stream.finalMessage();
          const u = msg.usage;
          cachedTok += u.cache_read_input_tokens ?? 0;
          inTok += u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
          outTok += u.output_tokens;
          searches += u.server_tool_use?.web_search_requests ?? 0;
          for (const b of msg.content) {
            if (b.type === "text") textParts.push(b.text);
            if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
              for (const r of b.content) if (r.type === "web_search_result") sources.set(r.url, r.title);
            }
          }
          if (msg.stop_reason !== "pause_turn") break;
          messages = [...messages, { role: "assistant", content: msg.content }];
        }
        if (!msg) throw new ProviderError("Anthropic: sem resposta", true);
        if (msg.stop_reason === "refusal") {
          throw new ProviderError("O modelo recusou a solicitação.", false);
        }
        return {
          text: textParts.join(""),
          stopReason: msg.stop_reason ?? "unknown",
          // input_tokens exclui tokens de cache; somamos para custo total correto.
          usage: { inputTokens: inTok, cachedInputTokens: cachedTok, outputTokens: outTok, webSearches: searches },
          sources: [...sources].map(([url, title]) => ({ url, title })),
        };
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        if (err instanceof Anthropic.APIError) {
          const status = err.status;
          const retryable = status === undefined || status === 429 || status >= 500;
          throw new ProviderError(`Anthropic: ${err.message}`, retryable, status);
        }
        if (err instanceof Error && err.name === "AbortError") throw err;
        throw new ProviderError(`Anthropic: ${(err as Error).message}`, true);
      }
    },
  };
}
