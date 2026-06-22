import OpenAI from "openai";
import { config } from "../config.js";

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
  readonly model: string;
  readonly dimensions: number;
}

// ── OpenAI backend ──────────────────────────────────────────────────────────

export class OpenAIEmbedder implements Embedder {
  readonly model = "text-embedding-3-small";
  readonly dimensions = 1536;
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey ?? config.openaiApiKey });
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
    });
    // Sort by index to preserve input order
    return response.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }
}

// ── Ollama backend ───────────────────────────────────────────────────────────

export class OllamaEmbedder implements Embedder {
  readonly model: string;
  readonly dimensions: number;
  private baseUrl: string;

  constructor(model = "nomic-embed-text", dimensions = 768, baseUrl?: string) {
    this.model = model;
    this.dimensions = dimensions;
    this.baseUrl = baseUrl ?? config.ollamaUrl;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const results: number[][] = [];
    for (const text of texts) {
      const res = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, prompt: text }),
      });
      if (!res.ok) {
        throw new Error(`Ollama embedding failed: ${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as { embedding: number[] };
      results.push(json.embedding);
    }
    return results;
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createEmbedder(): Embedder {
  if (config.openaiApiKey) {
    return new OpenAIEmbedder();
  }
  return new OllamaEmbedder();
}

// ── Chunking helper ──────────────────────────────────────────────────────────

export interface ChunkOptions {
  maxTokens?: number;   // approx chars / 4
  overlap?: number;     // number of chars to overlap between chunks
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const maxChars = (options.maxTokens ?? 512) * 4;
  const overlap = options.overlap ?? 200;

  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    chunks.push(text.slice(start, end));
    start += maxChars - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}
