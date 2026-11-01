import type { ModelSpec, TokenUsage } from "../pricing";
import type { Effort } from "../router";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateParams {
  model: ModelSpec;
  system: string;
  messages: ChatMessage[];
  maxOutputTokens: number;
  effort: Effort;
  /** Saída JSON estruturada validada pelo provedor (quando suportado). */
  jsonSchema?: Record<string, unknown>;
  /** Desliga raciocínio interno quando o modelo permite (tarefas simples). */
  minimalReasoning?: boolean;
  signal?: AbortSignal;
}

export interface GenerateResult {
  text: string;
  usage: TokenUsage;
  stopReason: string;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface AIProvider {
  readonly name: "anthropic" | "openai";
  generate(params: GenerateParams, onText?: (delta: string) => void): Promise<GenerateResult>;
}
