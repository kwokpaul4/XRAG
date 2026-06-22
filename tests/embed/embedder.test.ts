import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAIEmbedder, OllamaEmbedder, chunkText } from "../../src/embed/index.js";

// ── chunkText (pure — no mocking needed) ────────────────────────────────────

describe("chunkText", () => {
  it("returns single chunk when text is short", () => {
    const chunks = chunkText("Hello world");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("Hello world");
  });

  it("splits long text into overlapping chunks", () => {
    const text = "a".repeat(3000);
    const chunks = chunkText(text, { maxTokens: 256, overlap: 100 });
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should be at most maxTokens * 4 chars
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(256 * 4);
    }
  });

  it("overlap means adjacent chunks share content", () => {
    const text = "a".repeat(4000);
    const chunks = chunkText(text, { maxTokens: 256, overlap: 200 });
    // The tail of chunk[0] and head of chunk[1] should overlap by ~200 chars
    const tail = chunks[0].slice(-200);
    const head = chunks[1].slice(0, 200);
    expect(tail).toBe(head);
  });
});

// ── OpenAIEmbedder ───────────────────────────────────────────────────────────

describe("OpenAIEmbedder", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array for empty input", async () => {
    const embedder = new OpenAIEmbedder("test-key");
    const result = await embedder.embed([]);
    expect(result).toEqual([]);
  });

  it("calls OpenAI and returns embeddings in order", async () => {
    const fakeEmbedding = Array(1536).fill(0.1);
    const embedder = new OpenAIEmbedder("test-key");

    // Patch the internal client directly since the SDK doesn't expose embeddings on prototype
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn((embedder as any).client.embeddings, "create").mockResolvedValue({
      object: "list",
      data: [
        { object: "embedding", index: 1, embedding: Array(1536).fill(0.2) },
        { object: "embedding", index: 0, embedding: fakeEmbedding },
      ],
      model: "text-embedding-3-small",
      usage: { prompt_tokens: 2, total_tokens: 2 },
    });

    const result = await embedder.embed(["hello", "world"]);

    expect(result).toHaveLength(2);
    // index 0 should come first (sorted by index)
    expect(result[0]).toEqual(fakeEmbedding);
    expect(result[1]).toEqual(Array(1536).fill(0.2));
  });

  it("exposes correct model and dimensions", () => {
    const embedder = new OpenAIEmbedder("test-key");
    expect(embedder.model).toBe("text-embedding-3-small");
    expect(embedder.dimensions).toBe(1536);
  });
});

// ── OllamaEmbedder ───────────────────────────────────────────────────────────

describe("OllamaEmbedder", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array for empty input", async () => {
    const embedder = new OllamaEmbedder();
    const result = await embedder.embed([]);
    expect(result).toEqual([]);
  });

  it("calls Ollama API and returns embeddings", async () => {
    const fakeVec = Array(768).fill(0.5);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: fakeVec }),
      })
    );

    const embedder = new OllamaEmbedder("nomic-embed-text", 768, "http://localhost:11434");
    const result = await embedder.embed(["test text"]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(fakeVec);
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })
    );

    const embedder = new OllamaEmbedder();
    await expect(embedder.embed(["test"])).rejects.toThrow("Ollama embedding failed");
  });

  it("exposes correct model and dimensions", () => {
    const embedder = new OllamaEmbedder("nomic-embed-text", 768);
    expect(embedder.model).toBe("nomic-embed-text");
    expect(embedder.dimensions).toBe(768);
  });
});
