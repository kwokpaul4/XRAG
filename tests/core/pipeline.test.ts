import { describe, it, expect, vi, afterAll } from "vitest";
import { ingestText } from "../../src/core/ingest.js";
import { retrieve } from "../../src/core/retrieve.js";
import { rank } from "../../src/core/rank.js";
import { generate } from "../../src/core/generate.js";
import { deleteCollection } from "../../src/vector/client.js";
import type { Embedder } from "../../src/embed/index.js";
import type { RetrievedChunk } from "../../src/types.js";

const TEST_COLLECTION = "xrag_test_pipeline";

// Deterministic fake embedder: maps text to a fixed vector based on content hash
function makeEmbedder(dim = 384): Embedder {
  return {
    model: "fake",
    dimensions: dim,
    async embed(texts: string[]): Promise<number[][]> {
      return texts.map((t) => {
        const seed = t.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        return Array.from({ length: dim }, (_, i) => Math.sin(seed + i) * 0.5 + 0.5);
      });
    },
  };
}

const embedder = makeEmbedder();

afterAll(async () => {
  try { await deleteCollection(TEST_COLLECTION); } catch { /* ignore */ }
});

// ── ingest ────────────────────────────────────────────────────────────────────

describe("core/ingest", () => {
  it("ingests text and returns chunk count", async () => {
    const result = await ingestText(
      "Artificial intelligence is the simulation of human intelligence in machines. " +
      "Machine learning is a subset of AI that enables computers to learn from data. " +
      "Deep learning uses neural networks with many layers.",
      { sourceId: "test-src-1", domain: "ai", collection: TEST_COLLECTION, embedder }
    );
    expect(result.chunksIngested).toBeGreaterThanOrEqual(1);
    expect(result.errors).toHaveLength(0);
  });

  it("returns errors array on failure", async () => {
    const badEmbedder: Embedder = {
      model: "bad", dimensions: 0,
      async embed() { throw new Error("embedding failed"); },
    };
    const result = await ingestText("some text", {
      sourceId: "test-src-bad", domain: "ai", collection: TEST_COLLECTION, embedder: badEmbedder,
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.chunksIngested).toBe(0);
  });
});

// ── retrieve ─────────────────────────────────────────────────────────────────

describe("core/retrieve", () => {
  it("retrieves chunks after ingestion", async () => {
    // Ensure there's data in the collection
    await ingestText("The RAG pipeline retrieves relevant context before generating answers.", {
      sourceId: "test-src-2", domain: "ai", collection: TEST_COLLECTION, embedder,
    });

    const chunks = await retrieve({
      query: "how does RAG work",
      collection: TEST_COLLECTION,
      embedder,
      nResults: 3,
    });

    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].document.content.length).toBeGreaterThan(0);
    expect(typeof chunks[0].score).toBe("number");
  });
});

// ── rank ──────────────────────────────────────────────────────────────────────

describe("core/rank", () => {
  const makeChunks = (items: { content: string; domain: string; score: number }[]): RetrievedChunk[] =>
    items.map((item, i) => ({
      score: item.score,
      document: {
        id: `chunk-${i}`,
        sourceId: "src",
        chunkIndex: i,
        content: item.content,
        metadata: { domain: item.domain },
      },
    }));

  it("sorts by score descending", () => {
    const chunks = makeChunks([
      { content: "medium relevance text here", domain: "ai", score: 0.6 },
      { content: "high relevance text here", domain: "ai", score: 0.9 },
      { content: "low relevance", domain: "ai", score: 0.3 },
    ]);
    const ranked = rank(chunks);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score);
  });

  it("boosts domain-matching chunks", () => {
    const chunks = makeChunks([
      { content: "domain match content text here extra", domain: "medicine", score: 0.6 },
      { content: "no domain match content here extra words", domain: "robotics", score: 0.65 },
    ]);
    const ranked = rank(chunks, { domain: "medicine" });
    // medicine chunk: 0.6 * 1.1 = 0.66 > robotics 0.65 — should come first
    expect(ranked[0].document.metadata.domain).toBe("medicine");
  });

  it("penalises very short chunks", () => {
    const chunks = makeChunks([
      { content: "short", domain: "ai", score: 0.9 },
      { content: "This is a longer and more informative piece of content worth reading.", domain: "ai", score: 0.8 },
    ]);
    const ranked = rank(chunks);
    expect(ranked[0].document.content.length).toBeGreaterThan(10);
  });

  it("respects maxResults", () => {
    const chunks = makeChunks(
      Array.from({ length: 10 }, (_, i) => ({
        content: `Content item number ${i} with enough text`,
        domain: "ai",
        score: Math.random(),
      }))
    );
    const ranked = rank(chunks, { maxResults: 3 });
    expect(ranked).toHaveLength(3);
  });
});

// ── generate ─────────────────────────────────────────────────────────────────

describe("core/generate", () => {
  it("generates an answer from context chunks", async () => {
    const chunks: RetrievedChunk[] = [{
      score: 0.9,
      document: {
        id: "ctx-1", sourceId: "src", chunkIndex: 0,
        content: "AI is the simulation of human intelligence in machines.",
        metadata: { domain: "ai" },
      },
    }];

    // Build a fake async iterable that yields one text delta
    async function* fakeEvents() {
      yield {
        type: "content_block_delta" as const,
        delta: { type: "text_delta" as const, text: "AI stands for Artificial Intelligence." },
        index: 0,
      };
    }

    const fakeStream = Object.assign(fakeEvents(), {
      finalMessage: async () => ({
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    });

    const mockClient = {
      messages: {
        stream: vi.fn().mockReturnValue(fakeStream),
      },
    };

    const result = await generate({
      query: "What is AI?",
      chunks,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _client: mockClient as any,
    });

    expect(result.answer).toBe("AI stands for Artificial Intelligence.");
    expect(result.inputTokens).toBeGreaterThanOrEqual(0);
    expect(result.outputTokens).toBeGreaterThanOrEqual(0);
  });
});
