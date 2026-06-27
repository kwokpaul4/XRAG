import { config } from "../config.js";
import type { RetrievedChunk, ChatMessage } from "../types.js";
import Anthropic from "@anthropic-ai/sdk";

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

function buildPrompt(
  opts: Pick<GenerateOptions, "query" | "chunks" | "history" | "systemPrompt">
): { system: string; messages: { role: "user" | "assistant"; content: string }[] } {
  const contextBlock = opts.chunks.length > 0
    ? `<context>\n${opts.chunks
        .map((c, i) => `[${i + 1}] ${c.document.content}`)
        .join("\n\n")}\n</context>`
    : "";

  const system = [opts.systemPrompt ?? DEFAULT_SYSTEM, contextBlock]
    .filter(Boolean)
    .join("\n\n");

  const messages = [
    ...(opts.history ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: opts.query },
  ];

  return { system, messages };
}

// ── Ollama backend ────────────────────────────────────────────────────────────

async function* ollamaStream(
  system: string,
  messages: { role: string; content: string }[]
): AsyncGenerator<string> {
  const ollamaMessages = [
    { role: "system", content: system },
    ...messages,
  ];

  const res = await fetch(`${config.ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.ollamaChatModel,
      messages: ollamaMessages,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Ollama chat failed: ${res.status} ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let hasContent = false;
  let thinkingBuffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value, { stream: true }).split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const json = JSON.parse(line) as {
          message?: { content?: string; thinking?: string };
          done?: boolean;
        };
        if (json.message?.content) {
          hasContent = true;
          yield json.message.content;
        } else if (json.message?.thinking) {
          // Buffer thinking tokens — yield as fallback if no content tokens arrive
          thinkingBuffer += json.message.thinking;
        }
        if (json.done) {
          // If model only produced thinking (qwen3.5 reasoning mode), yield that
          if (!hasContent && thinkingBuffer.trim()) {
            yield thinkingBuffer;
          }
          return;
        }
      } catch { /* partial line */ }
    }
  }
}

// ── Claude backend ────────────────────────────────────────────────────────────

async function* claudeStream(
  system: string,
  messages: Anthropic.MessageParam[],
  client: Anthropic
): AsyncGenerator<string> {
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thinking: { type: "adaptive" } as any,
    system,
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

// ── Public API ────────────────────────────────────────────────────────────────

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  let answer = "";

  for await (const token of generateStream(opts)) {
    answer += token;
    opts.onToken?.(token);
  }

  return { answer, inputTokens: 0, outputTokens: 0 };
}

/** SSE-compatible token stream — uses Claude if ANTHROPIC_API_KEY is set, else Ollama */
export async function* generateStream(
  opts: Omit<GenerateOptions, "onToken">
): AsyncGenerator<string> {
  const { system, messages } = buildPrompt(opts);

  if (config.anthropicApiKey) {
    const client = opts._client ?? new Anthropic({ apiKey: config.anthropicApiKey });
    yield* claudeStream(system, messages as Anthropic.MessageParam[], client);
  } else {
    yield* ollamaStream(system, messages);
  }
}
