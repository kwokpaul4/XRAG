import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import pdfParse from "pdf-parse";
import { chunkText } from "../embed/index.js";
import { chunkId } from "./base.js";
import type { Document } from "../types.js";
import type { SourceAdapter } from "./base.js";

export interface PdfSourceConfig {
  sourceId: string;
  filePath: string;
  domain?: string;
  chunkSize?: number;
  overlap?: number;
  /** Optional pre-loaded buffer — used in tests to skip real file I/O */
  _buffer?: Buffer;
}

export class PdfAdapter implements SourceAdapter {
  async *ingest(config: Record<string, unknown>): AsyncIterable<Document> {
    const cfg = config as unknown as PdfSourceConfig;
    const buffer = cfg._buffer ?? await readFile(cfg.filePath);

    let data: Awaited<ReturnType<typeof pdfParse>>;
    try {
      data = await pdfParse(buffer);
    } catch (err) {
      throw new Error(`Failed to parse PDF "${basename(cfg.filePath)}": ${String(err)}`);
    }

    if (!data.text?.trim()) {
      throw new Error(`PDF "${basename(cfg.filePath)}" contains no extractable text (may be scanned/image-only)`);
    }

    const chunks = chunkText(data.text, {
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
          pageCount: data.numpages,
          chunkIndex: i,
          totalChunks: chunks.length,
        },
      };
    }
  }
}
