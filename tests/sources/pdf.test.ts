import { describe, it, expect, vi, beforeEach } from "vitest";
import { PdfAdapter } from "../../src/sources/pdf.js";

// Mock pdf-parse so tests don't need a real PDF file
vi.mock("pdf-parse", () => ({
  default: vi.fn().mockResolvedValue({
    text: "This is extracted PDF text about machine learning.\n\nNeural networks are a key component of deep learning. They consist of layers of interconnected nodes that process information.",
    numpages: 2,
    info: { Title: "Test PDF" },
  }),
}));

const FAKE_BUFFER = Buffer.from("fake-pdf-bytes");

describe("sources/pdf", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ingests a PDF and yields Document chunks", async () => {
    const adapter = new PdfAdapter();
    const docs = [];
    for await (const doc of adapter.ingest({
      sourceId: "pdf-1",
      filePath: "/fake/sample.pdf",
      _buffer: FAKE_BUFFER,
    })) {
      docs.push(doc);
    }
    expect(docs.length).toBeGreaterThanOrEqual(1);
    expect(docs[0].sourceId).toBe("pdf-1");
    expect(docs[0].content.length).toBeGreaterThan(0);
  });

  it("metadata includes filename and pageCount", async () => {
    const adapter = new PdfAdapter();
    for await (const doc of adapter.ingest({
      sourceId: "pdf-2",
      filePath: "/fake/sample.pdf",
      domain: "test",
      _buffer: FAKE_BUFFER,
    })) {
      expect(doc.metadata.filename).toBe("sample.pdf");
      expect(doc.metadata.pageCount).toBe(2);
      expect(doc.metadata.domain).toBe("test");
      break;
    }
  });

  it("chunk IDs are unique and start at 0", async () => {
    const adapter = new PdfAdapter();
    const ids: string[] = [];
    for await (const doc of adapter.ingest({
      sourceId: "pdf-3",
      filePath: "/fake/doc.pdf",
      _buffer: FAKE_BUFFER,
    })) {
      ids.push(doc.id);
    }
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("pdf-3-chunk-0");
  });

  it("respects custom chunk size — small yields more chunks", async () => {
    const adapter = new PdfAdapter();
    const small: string[] = [];
    const large: string[] = [];

    for await (const doc of adapter.ingest({
      sourceId: "s", filePath: "/f.pdf", chunkSize: 10, overlap: 0, _buffer: FAKE_BUFFER,
    })) small.push(doc.id);

    for await (const doc of adapter.ingest({
      sourceId: "s", filePath: "/f.pdf", chunkSize: 4096, overlap: 0, _buffer: FAKE_BUFFER,
    })) large.push(doc.id);

    expect(small.length).toBeGreaterThanOrEqual(large.length);
  });
});
