import type { Document } from "../types.js";

export interface SourceAdapter {
  /** Stream document chunks from the source */
  ingest(config: Record<string, unknown>): AsyncIterable<Document>;
}

/** Generate a deterministic chunk ID from source + index */
export function chunkId(sourceId: string, index: number): string {
  return `${sourceId}-chunk-${index}`;
}

/** Split text into paragraphs, then re-join into chunks up to maxChars */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
