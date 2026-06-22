import { describe, it, expect, vi } from "vitest";
import { UrlAdapter } from "../../src/sources/url.js";

const HTML_CONTENT = `
<html>
<head><title>Test Page</title><style>body { color: red; }</style></head>
<body>
  <h1>Introduction to AI</h1>
  <script>var x = 1;</script>
  <p>Artificial intelligence is transforming the world. Machine learning enables computers to learn from data.</p>
  <p>Deep learning is a subset of machine learning that uses neural networks with many layers.</p>
</body>
</html>`;

const PLAIN_TEXT = "This is plain text content.\n\nIt has multiple paragraphs.\n\nEach one has useful information.";

function mockFetch(body: string, contentType = "text/html"): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: (h: string) => (h === "content-type" ? contentType : null) },
    text: async () => body,
  }) as unknown as typeof fetch;
}

describe("sources/url", () => {
  it("fetches HTML and strips tags", async () => {
    const adapter = new UrlAdapter();
    const docs = [];
    for await (const doc of adapter.ingest({
      sourceId: "url-1",
      url: "https://example.com",
      _fetchFn: mockFetch(HTML_CONTENT),
    })) {
      docs.push(doc);
    }
    expect(docs.length).toBeGreaterThanOrEqual(1);
    // Should not contain HTML tags
    expect(docs[0].content).not.toMatch(/<[^>]+>/);
    // Should not contain script content
    expect(docs[0].content).not.toContain("var x = 1");
    // Should contain real text
    expect(docs.map((d) => d.content).join(" ")).toContain("Artificial intelligence");
  });

  it("handles plain text content-type", async () => {
    const adapter = new UrlAdapter();
    const docs = [];
    for await (const doc of adapter.ingest({
      sourceId: "url-2",
      url: "https://example.com/data.txt",
      _fetchFn: mockFetch(PLAIN_TEXT, "text/plain"),
    })) {
      docs.push(doc);
    }
    expect(docs[0].content).toContain("plain text");
  });

  it("metadata includes url and domain", async () => {
    const adapter = new UrlAdapter();
    for await (const doc of adapter.ingest({
      sourceId: "url-3",
      url: "https://example.com/page",
      domain: "web",
      _fetchFn: mockFetch(HTML_CONTENT),
    })) {
      expect(doc.metadata.url).toBe("https://example.com/page");
      expect(doc.metadata.domain).toBe("web");
      break;
    }
  });

  it("throws on non-ok response", async () => {
    const adapter = new UrlAdapter();
    const badFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: { get: () => null },
    }) as unknown as typeof fetch;

    const gen = adapter.ingest({
      sourceId: "url-4",
      url: "https://example.com/missing",
      _fetchFn: badFetch,
    });

    await expect(gen.next()).rejects.toThrow("404");
  });

  it("chunk IDs are unique", async () => {
    const adapter = new UrlAdapter();
    const ids: string[] = [];
    for await (const doc of adapter.ingest({
      sourceId: "url-5",
      url: "https://example.com",
      _fetchFn: mockFetch(HTML_CONTENT),
    })) {
      ids.push(doc.id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});
