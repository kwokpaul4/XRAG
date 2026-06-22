import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import * as XLSX from "xlsx";
import { chunkId } from "./base.js";
import type { Document } from "../types.js";
import type { SourceAdapter } from "./base.js";

export interface ExcelSourceConfig {
  sourceId: string;
  filePath: string;
  domain?: string;
  /** Which sheets to ingest — defaults to all sheets */
  sheets?: string[];
  /** Optional pre-loaded buffer for testing */
  _buffer?: Buffer;
}

export class ExcelAdapter implements SourceAdapter {
  async *ingest(config: Record<string, unknown>): AsyncIterable<Document> {
    const cfg = config as unknown as ExcelSourceConfig;
    const buffer = cfg._buffer ?? await readFile(cfg.filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const targetSheets = cfg.sheets?.length
      ? workbook.SheetNames.filter((n) => cfg.sheets!.includes(n))
      : workbook.SheetNames;

    let chunkIndex = 0;

    for (const sheetName of targetSheets) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      // Convert sheet to array of row objects
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: false,
      });

      if (rows.length === 0) continue;

      // Each row becomes a document chunk — stringify key:value pairs
      for (const row of rows) {
        const content = Object.entries(row)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" | ");

        if (!content.trim()) continue;

        yield {
          id: chunkId(cfg.sourceId, chunkIndex),
          sourceId: cfg.sourceId,
          chunkIndex,
          content,
          metadata: {
            source: cfg.filePath,
            filename: basename(cfg.filePath),
            domain: cfg.domain ?? "default",
            sheet: sheetName,
            chunkIndex,
          },
        };
        chunkIndex++;
      }
    }
  }
}
