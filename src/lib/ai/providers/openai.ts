import "server-only";
import OpenAI from "openai";
import type { AIProvider, GenerateParams, GenerateResult } from "./types";
import { ProviderError } from "./types";

export function createOpenAIProvider(apiKey: string): AIProvider {
  const client = new OpenAI({ apiKey, maxRetries: 1, timeout: 90_000 });

  return {
    name: "openai",
    async generate(p: GenerateParams, onText?: (d: string) => void): Promise<GenerateResult> {
      try {
        const stream = await client.chat.completions.create(
          {
            model: p.model.id,
            stream: true,
            stream_options: { include_usage: true },
            max_completion_tokens: p.maxOutputTokens,
            reasoning_effort: p.minimalReasoning ? "minimal" : p.effort,
            messages: [
              { role: "system", content: p.system },
              ...p.messages.map((m) => ({ role: m.role, content: m.content })),
            ],
            ...(p.jsonSchema
              ? {
                  response_format: {
                    type: "json_schema" as const,
                    json_schema: { name: "life_engine_output", schema: p.jsonSchema, strict: false },
                  },
                }
              : {}),
          },
          { signal: p.signal },
        );
        let text = "";
        let finish = "unknown";
        let usage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
        for await (const chunk of stream) {
          const choice = chunk.choices?.[0];
          const delta = choice?.delta?.content;
          if (delta) {
            text += delta;
            onText?.(delta);
          }
          if (choice?.finish_reason) finish = choice.finish_reason;
          if (chunk.usage) {
            usage = {
              inputTokens: chunk.usage.prompt_tokens,
              outputTokens: chunk.usage.completion_tokens,
              cachedInputTokens: chunk.usage.prompt_tokens_details?.cached_tokens ?? 0,
            };
          }
        }
        return { text, usage, stopReason: finish };
      } catch (err) {
        if (err instanceof OpenAI.APIError) {
          const status = err.status;
          const retryable = status === undefined || status === 429 || status >= 500;
          throw new ProviderError(`OpenAI: ${err.message}`, retryable, status);
        }
        if (err instanceof Error && err.name === "AbortError") throw err;
        throw new ProviderError(`OpenAI: ${(err as Error).message}`, true);
      }
    },
  };
}
