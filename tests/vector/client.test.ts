import { describe, it, expect, afterAll } from "vitest";
import {
  ping,
  getOrCreateCollection,
  deleteCollection,
  listCollections,
  upsertDocuments,
  queryDocuments,
  deleteDocuments,
} from "../../src/vector/client.js";

const TEST_COLLECTION = "xrag_test_vector_client";

// Simple fixed embedding for deterministic tests (384-dim, all same value)
function fakeEmbedding(value: number, dim = 384): number[] {
  return Array(dim).fill(value);
}

describe("vector/client", () => {
  afterAll(async () => {
    // Clean up test collection
    try {
      await deleteCollection(TEST_COLLECTION);
    } catch {
      // ignore if already gone
    }
  });

  it("ping returns true when ChromaDB is reachable", async () => {
    const ok = await ping();
    expect(ok).toBe(true);
  });

  it("getOrCreateCollection creates a collection", async () => {
    const col = await getOrCreateCollection(TEST_COLLECTION);
    expect(col.name).toBe(TEST_COLLECTION);
  });

  it("listCollections includes the created collection", async () => {
    const cols = await listCollections();
    expect(cols).toContain(TEST_COLLECTION);
  });

  it("upsertDocuments stores documents", async () => {
    await upsertDocuments({
      collectionName: TEST_COLLECTION,
      ids: ["doc-1", "doc-2"],
      embeddings: [fakeEmbedding(0.1), fakeEmbedding(0.9)],
      documents: ["The quick brown fox", "A totally different topic"],
      metadatas: [
        { source: "test", domain: "default" },
        { source: "test", domain: "default" },
      ],
    });

    const col = await getOrCreateCollection(TEST_COLLECTION);
    const count = await col.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("queryDocuments returns nearest neighbours", async () => {
    const results = await queryDocuments({
      collectionName: TEST_COLLECTION,
      queryEmbedding: fakeEmbedding(0.1),
      nResults: 2,
    });

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].id).toBeDefined();
    expect(results[0].document).toBeDefined();
    expect(typeof results[0].distance).toBe("number");
    // doc-1 (embedding ~0.1) should be closest to query embedding 0.1
    expect(results[0].id).toBe("doc-1");
  });

  it("deleteDocuments removes specific documents", async () => {
    await deleteDocuments(TEST_COLLECTION, ["doc-2"]);
    const col = await getOrCreateCollection(TEST_COLLECTION);
    const count = await col.count();
    expect(count).toBe(1);
  });

  it("deleteCollection removes the collection", async () => {
    await deleteCollection(TEST_COLLECTION);
    const cols = await listCollections();
    expect(cols).not.toContain(TEST_COLLECTION);
  });
});
