import { Router, type Request, type Response } from "express";
import multer from "multer";
import { tmpdir } from "node:os";
import { query as dbQuery, queryMany, queryOne } from "../../db/client.js";
import { getDomainOrDefault, collectionForDomain } from "../../domains/index.js";
import { ingest } from "../../core/ingest.js";
import { TextAdapter } from "../../sources/text.js";
import { PdfAdapter } from "../../sources/pdf.js";
import { ExcelAdapter } from "../../sources/excel.js";
import { UrlAdapter } from "../../sources/url.js";
import { createEmbedder } from "../../embed/index.js";
import type { SourceType } from "../../types.js";

export const sourcesRouter = Router();
const upload = multer({ dest: tmpdir() });

// GET /sources
sourcesRouter.get("/", async (_req: Request, res: Response): Promise<void> => {
  const rows = await queryMany<{
    id: string; name: string; type: string; domain: string; created_at: string;
  }>("SELECT id, name, type, domain, created_at FROM sources ORDER BY created_at DESC");
  res.json(rows);
});

// GET /sources/:id
sourcesRouter.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const row = await queryOne(
    "SELECT * FROM sources WHERE id = $1",
    [req.params.id]
  );
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

// DELETE /sources/:id
sourcesRouter.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  await dbQuery("DELETE FROM sources WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

// POST /sources/url — ingest from URL
sourcesRouter.post("/url", async (req: Request, res: Response): Promise<void> => {
  const { url, name, domain = "default" } = req.body as {
    url?: string; name?: string; domain?: string;
  };
  if (!url) { res.status(400).json({ error: "url is required" }); return; }

  const row = await dbQuery<{ id: string }>(
    "INSERT INTO sources (name, type, domain, config) VALUES ($1, $2, $3, $4) RETURNING id",
    [name ?? url, "url", domain, JSON.stringify({ url })]
  );
  const sourceId = row.rows[0].id;

  const d = getDomainOrDefault(domain);
  const result = await ingest({
    sourceId, domain, collection: collectionForDomain(d),
    adapter: new UrlAdapter(),
    adapterConfig: { url },
    embedder: createEmbedder(),
  });

  res.json({ sourceId, ...result });
});

// POST /sources/upload — ingest from file upload
sourcesRouter.post("/upload", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "file is required" }); return; }

  const { domain = "default", name } = req.body as { domain?: string; name?: string };
  const filePath = req.file.path;
  const originalName = req.file.originalname;
  const mimeType = req.file.mimetype;

  let type: SourceType = "text";
  let adapter;
  if (mimeType === "application/pdf" || originalName.endsWith(".pdf")) {
    type = "pdf"; adapter = new PdfAdapter();
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    originalName.endsWith(".xlsx") || originalName.endsWith(".xls")
  ) {
    type = "excel"; adapter = new ExcelAdapter();
  } else {
    adapter = new TextAdapter();
  }

  const row = await dbQuery<{ id: string }>(
    "INSERT INTO sources (name, type, domain, config) VALUES ($1, $2, $3, $4) RETURNING id",
    [name ?? originalName, type, domain, JSON.stringify({ filePath, originalName })]
  );
  const sourceId = row.rows[0].id;

  const d = getDomainOrDefault(domain);
  const result = await ingest({
    sourceId, domain, collection: collectionForDomain(d),
    adapter,
    adapterConfig: { filePath },
    embedder: createEmbedder(),
  });

  res.json({ sourceId, filename: originalName, ...result });
});
