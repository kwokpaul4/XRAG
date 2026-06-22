import { upsertDocuments } from "../vector/client.js";
import { query as dbQuery } from "../db/client.js";
import { chunkText } from "../embed/index.js";
import type { Embedder } from "../embed/index.js";
import type { SourceAdapter } from "../sources/base.js";
import type { Document } from "../types.js";

export interface IngestOptions {
  sourceId: string;
  domain: string;
  collection: string;
  adapter: SourceAdapter;
  adapterConfig: Record<string, unknown>;
  embedder: Embedder;
  batchSize?: number;
}

export interface IngestResult {
  chunksIngested: number;
  errors: string[];
}

export async function ingest(opts: IngestOptions): Promise<IngestResult> {
  const batchSize = opts.batchSize ?? 20;
  let chunksIngested = 0;
  const errors: string[] = [];

  let batch: Document[] = [];

  const flushBatch = async (docs: Document[]) => {
    try {
      const texts = docs.map((d) => d.content);
      const embeddings = await opts.embedder.embed(texts);

      await upsertDocuments({
        collectionName: opts.collection,
        ids: docs.map((d) => d.id),
        embeddings,
        documents: texts,
        metadatas: docs.map((d) =>
          Object.fromEntries(
            Object.entries(d.metadata).map(([k, v]) => [k, String(v)])
          ) as Record<string, string>
        ),
      });

      // Mirror to postgres for auditing
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        await dbQuery(
          `INSERT INTO documents (id, source_id, chunk_index, content, metadata, vector_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE
             SET content = EXCLUDED.content,
                 metadata = EXCLUDED.metadata,
                 vector_id = EXCLUDED.vector_id`,
          [doc.id, doc.sourceId, doc.chunkIndex, doc.content, JSON.stringify(doc.metadata), doc.id]
        );
      }

      chunksIngested += docs.length;
    } catch (err) {
      errors.push(String(err));
    }
  };

  for await (const doc of opts.adapter.ingest({ ...opts.adapterConfig, sourceId: opts.sourceId })) {
    batch.push(doc);
    if (batch.length >= batchSize) {
      await flushBatch(batch);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await flushBatch(batch);
  }

  return { chunksIngested, errors };
}

/** Convenience wrapper that chunks plain text directly */
export async function ingestText(
  text: string,
  opts: { sourceId: string; domain: string; collection: string; embedder: Embedder }
): Promise<IngestResult> {
  const chunks = chunkText(text, { maxTokens: 512, overlap: 200 });
  const docs: Document[] = chunks.map((content, i) => ({
    id: `${opts.sourceId}-chunk-${i}`,
    sourceId: opts.sourceId,
    chunkIndex: i,
    content,
    metadata: { domain: opts.domain, chunkIndex: i, totalChunks: chunks.length },
  }));

  try {
    const embeddings = await opts.embedder.embed(docs.map((d) => d.content));
    await upsertDocuments({
      collectionName: opts.collection,
      ids: docs.map((d) => d.id),
      embeddings,
      documents: docs.map((d) => d.content),
      metadatas: docs.map((d) =>
        Object.fromEntries(
          Object.entries(d.metadata).map(([k, v]) => [k, String(v)])
        ) as Record<string, string>
      ),
    });
    return { chunksIngested: docs.length, errors: [] };
  } catch (err) {
    return { chunksIngested: 0, errors: [String(err)] };
  }
}
