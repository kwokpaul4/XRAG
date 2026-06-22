import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { chunkText } from "../embed/index.js";
import { chunkId } from "./base.js";
import type { Document } from "../types.js";
import type { SourceAdapter } from "./base.js";

export interface TextSourceConfig {
  sourceId: string;
  filePath: string;
  domain?: string;
  chunkSize?: number;   // tokens (approx chars/4)
  overlap?: number;     // chars
}

export class TextAdapter implements SourceAdapter {
  async *ingest(config: Record<string, unknown>): AsyncIterable<Document> {
    const cfg = config as unknown as TextSourceConfig;
    const raw = await readFile(cfg.filePath, "utf8");
    const chunks = chunkText(raw, {
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
          source: cfg.filePath,
          filename: basename(cfg.filePath),
          domain: cfg.domain ?? "default",
          chunkIndex: i,
          totalChunks: chunks.length,
        },
      };
    }
  }
}
