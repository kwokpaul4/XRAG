import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { ExcelAdapter } from "../../src/sources/excel.js";

/** Create a minimal Excel buffer in memory for testing */
function makeExcelBuffer(sheets: Record<string, Record<string, unknown>[]>): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

const SAMPLE_BUFFER = makeExcelBuffer({
  Sheet1: [
    { name: "Alice", role: "Engineer", score: 95 },
    { name: "Bob",   role: "Designer", score: 87 },
    { name: "Carol", role: "Manager",  score: 91 },
  ],
  Sheet2: [
    { product: "Widget A", price: 10.99 },
    { product: "Widget B", price: 24.50 },
  ],
});

describe("sources/excel", () => {
  it("ingests all sheets by default", async () => {
    const adapter = new ExcelAdapter();
    const docs = [];
    for await (const doc of adapter.ingest({
      sourceId: "xl-1",
      filePath: "/fake/data.xlsx",
      _buffer: SAMPLE_BUFFER,
    })) {
      docs.push(doc);
    }
    // 3 rows from Sheet1 + 2 rows from Sheet2 = 5 docs
    expect(docs).toHaveLength(5);
  });

  it("respects sheet filter", async () => {
    const adapter = new ExcelAdapter();
    const docs = [];
    for await (const doc of adapter.ingest({
      sourceId: "xl-2",
      filePath: "/fake/data.xlsx",
      sheets: ["Sheet1"],
      _buffer: SAMPLE_BUFFER,
    })) {
      docs.push(doc);
    }
    expect(docs).toHaveLength(3);
    expect(docs.every((d) => d.metadata.sheet === "Sheet1")).toBe(true);
  });

  it("content is key:value pairs from the row", async () => {
    const adapter = new ExcelAdapter();
    for await (const doc of adapter.ingest({
      sourceId: "xl-3",
      filePath: "/fake/data.xlsx",
      sheets: ["Sheet1"],
      _buffer: SAMPLE_BUFFER,
    })) {
      expect(doc.content).toContain("name:");
      expect(doc.content).toContain("role:");
      break;
    }
  });

  it("metadata includes sheet name and filename", async () => {
    const adapter = new ExcelAdapter();
    for await (const doc of adapter.ingest({
      sourceId: "xl-4",
      filePath: "/fake/report.xlsx",
      domain: "finance",
      _buffer: SAMPLE_BUFFER,
    })) {
      expect(doc.metadata.filename).toBe("report.xlsx");
      expect(doc.metadata.domain).toBe("finance");
      expect(typeof doc.metadata.sheet).toBe("string");
      break;
    }
  });

  it("chunk IDs are globally unique across sheets", async () => {
    const adapter = new ExcelAdapter();
    const ids: string[] = [];
    for await (const doc of adapter.ingest({
      sourceId: "xl-5",
      filePath: "/fake/data.xlsx",
      _buffer: SAMPLE_BUFFER,
    })) {
      ids.push(doc.id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});
