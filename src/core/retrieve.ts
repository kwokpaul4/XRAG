import { queryDocuments } from "../vector/client.js";
import type { Embedder } from "../embed/index.js";
import type { RetrievedChunk } from "../types.js";

export interface RetrieveOptions {
  query: string;
  collection: string;
  embedder: Embedder;
  nResults?: number;
  filter?: Record<string, string>;
}

export async function retrieve(opts: RetrieveOptions): Promise<RetrievedChunk[]> {
  const [queryEmbedding] = await opts.embedder.embed([opts.query]);

  const results = await queryDocuments({
    collectionName: opts.collection,
    queryEmbedding,
    nResults: opts.nResults ?? 5,
    where: opts.filter,
  });

  return results.map((r) => ({
    document: {
      id: r.id,
      sourceId: (r.metadata.sourceId as string) ?? r.id,
      chunkIndex: Number(r.metadata.chunkIndex ?? 0),
      content: r.document,
      metadata: r.metadata,
      vectorId: r.id,
    },
    score: 1 - r.distance, // convert distance to similarity score
  }));
}
