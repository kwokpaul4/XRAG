import { chunkText } from "../embed/index.js";
import { chunkId } from "./base.js";
import type { Document } from "../types.js";
import type { SourceAdapter } from "./base.js";

export interface UrlSourceConfig {
  sourceId: string;
  url: string;
  domain?: string;
  chunkSize?: number;
  overlap?: number;
  /** Override fetch for testing */
  _fetchFn?: typeof fetch;
}

/** Strip HTML tags and collapse whitespace */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}

export class UrlAdapter implements SourceAdapter {
  async *ingest(config: Record<string, unknown>): AsyncIterable<Document> {
    const cfg = config as unknown as UrlSourceConfig;
    const fetchFn = cfg._fetchFn ?? fetch;

    const response = await fetchFn(cfg.url, {
      headers: { "User-Agent": "XRAG-Bot/1.0" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${cfg.url}: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const raw = await response.text();
    const text = contentType.includes("text/html") ? stripHtml(raw) : raw;

    const chunks = chunkText(text, {
      maxTokens: cfg.chunkSize ?? 512,
      overlap: cfg.overlap ?? 200,
    });

    for (let i = 0; i < chunks.length; i++) {
      yield {
        id: chunkId(cfg.sourceId, i),
        sourceId: cfg.sourceId,
        chunkIndex: i,
        content: chunks[i],
        metadata: {
          source: cfg.url,
          url: cfg.url,
          domain: cfg.domain ?? "default",
          chunkIndex: i,
          totalChunks: chunks.length,
        },
      };
    }
  }
}
