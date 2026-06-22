import { describe, it, expect } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TextAdapter } from "../../src/sources/text.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, "../fixtures/sample.txt");

describe("sources/text", () => {
  it("ingests a text file and yields Document chunks", async () => {
    const adapter = new TextAdapter();
    const result = [];

    for await (const doc of adapter.ingest({ sourceId: "src-1", filePath: FIXTURE })) {
      result.push(doc);
    }

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].sourceId).toBe("src-1");
    expect(result[0].chunkIndex).toBe(0);
    expect(result[0].content.length).toBeGreaterThan(0);
  });

  it("chunk IDs are unique and deterministic", async () => {
    const adapter = new TextAdapter();
    const ids: string[] = [];
    for await (const doc of adapter.ingest({ sourceId: "src-2", filePath: FIXTURE })) {
      ids.push(doc.id);
    }
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    expect(ids[0]).toMatch(/^src-2-chunk-0$/);
  });

  it("metadata includes filename and domain", async () => {
    const adapter = new TextAdapter();
    for await (const doc of adapter.ingest({
      sourceId: "src-3",
      filePath: FIXTURE,
      domain: "ai",
    })) {
      expect(doc.metadata.filename).toBe("sample.txt");
      expect(doc.metadata.domain).toBe("ai");
      break;
    }
  });

  it("respects custom chunk size — small size yields more chunks", async () => {
    const adapter = new TextAdapter();
    const small: string[] = [];
    const large: string[] = [];

    for await (const doc of adapter.ingest({
      sourceId: "s", filePath: FIXTURE, chunkSize: 50, overlap: 0,
    })) small.push(doc.id);

    for await (const doc of adapter.ingest({
      sourceId: "s", filePath: FIXTURE, chunkSize: 2048, overlap: 0,
    })) large.push(doc.id);

    expect(small.length).toBeGreaterThan(large.length);
  });
});
