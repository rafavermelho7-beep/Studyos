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
      try {
        const stream = client.messages.stream(
          {
            model: p.model.id,
            max_tokens: p.maxOutputTokens,
            // Prompt de sistema estável primeiro => elegível a cache de prefixo.
            system: [{ type: "text", text: p.system, cache_control: { type: "ephemeral" } }],
            messages: p.messages.map((m) => ({ role: m.role, content: m.content })),
            output_config: {
              effort: p.effort,
              ...(p.jsonSchema ? { format: { type: "json_schema", schema: p.jsonSchema } } : {}),
            },
            ...(thinking ? { thinking } : {}),
          },
          { signal: p.signal },
        );
        if (onText) {
          stream.on("text", (delta) => onText(delta));
        }
        const msg = await stream.finalMessage();
        if (msg.stop_reason === "refusal") {
          throw new ProviderError("O modelo recusou a solicitação.", false);
        }
        const text = msg.content
          .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("");
        const u = msg.usage;
        const cached = u.cache_read_input_tokens ?? 0;
        const created = u.cache_creation_input_tokens ?? 0;
        return {
          text,
          stopReason: msg.stop_reason ?? "unknown",
          usage: {
            // input_tokens exclui tokens de cache; somamos para custo total correto.
            inputTokens: u.input_tokens + cached + created,
            cachedInputTokens: cached,
            outputTokens: u.output_tokens,
          },
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
