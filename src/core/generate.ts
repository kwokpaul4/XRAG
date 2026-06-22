import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import type { RetrievedChunk, ChatMessage } from "../types.js";

const DEFAULT_SYSTEM = `You are a helpful AI assistant. Answer questions based on the provided context.
If the context does not contain enough information to answer, say so honestly.
Always be accurate, concise, and cite relevant parts of the context when appropriate.`;

export interface GenerateOptions {
  query: string;
  chunks: RetrievedChunk[];
  history?: ChatMessage[];
  systemPrompt?: string;
  domain?: string;
  /** Called with each streamed text delta */
  onToken?: (token: string) => void;
  /** Optional client override — used in tests */
  _client?: Anthropic;
}

export interface GenerateResult {
  answer: string;
  inputTokens: number;
  outputTokens: number;
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const client = opts._client ?? new Anthropic({ apiKey: config.anthropicApiKey });

  const contextBlock = opts.chunks.length > 0
    ? `<context>\n${opts.chunks
        .map((c, i) => `[${i + 1}] ${c.document.content}`)
        .join("\n\n")}\n</context>`
    : "";

  const systemPrompt = [opts.systemPrompt ?? DEFAULT_SYSTEM, contextBlock]
    .filter(Boolean)
    .join("\n\n");

  const messages: Anthropic.MessageParam[] = [
    ...(opts.history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: opts.query },
  ];

  let answer = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thinking: { type: "adaptive" } as any,
    system: systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      answer += event.delta.text;
      opts.onToken?.(event.delta.text);
    }
  }

  const final = await stream.finalMessage();
  inputTokens = final.usage.input_tokens;
  outputTokens = final.usage.output_tokens;

  return { answer, inputTokens, outputTokens };
}

/** Build SSE-compatible generator for streaming to HTTP clients */
export async function* generateStream(
  opts: Omit<GenerateOptions, "onToken">
): AsyncGenerator<string> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const contextBlock = opts.chunks.length > 0
    ? `<context>\n${opts.chunks
        .map((c, i) => `[${i + 1}] ${c.document.content}`)
        .join("\n\n")}\n</context>`
    : "";

  const systemPrompt = [opts.systemPrompt ?? DEFAULT_SYSTEM, contextBlock]
    .filter(Boolean)
    .join("\n\n");

  const messages: Anthropic.MessageParam[] = [
    ...(opts.history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: opts.query },
  ];

  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thinking: { type: "adaptive" } as any,
    system: systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
