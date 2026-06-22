import { ChromaClient, Collection } from "chromadb";
import { config } from "../config.js";

let _client: ChromaClient | null = null;

export function getChromaClient(): ChromaClient {
  if (!_client) {
    _client = new ChromaClient({ path: config.chromaUrl });
  }
  return _client;
}

export async function getOrCreateCollection(name: string): Promise<Collection> {
  const client = getChromaClient();
  return client.getOrCreateCollection({ name });
}

export async function deleteCollection(name: string): Promise<void> {
  const client = getChromaClient();
  await client.deleteCollection({ name });
}

export async function listCollections(): Promise<string[]> {
  const client = getChromaClient();
  const cols = await client.listCollections();
  // chromadb v1.9+ returns string[] directly
  return cols.map((c: unknown) => (typeof c === "string" ? c : (c as { name: string }).name));
}

export interface UpsertParams {
  collectionName: string;
  ids: string[];
  embeddings: number[][];
  documents: string[];
  metadatas?: Record<string, string | number | boolean>[];
}

export async function upsertDocuments(params: UpsertParams): Promise<void> {
  const collection = await getOrCreateCollection(params.collectionName);
  await collection.upsert({
    ids: params.ids,
    embeddings: params.embeddings,
    documents: params.documents,
    metadatas: params.metadatas,
  });
}

export interface QueryParams {
  collectionName: string;
  queryEmbedding: number[];
  nResults?: number;
  where?: Record<string, string | number | boolean>;
}

export interface QueryResult {
  id: string;
  document: string;
  distance: number;
  metadata: Record<string, string | number | boolean>;
}

export async function queryDocuments(params: QueryParams): Promise<QueryResult[]> {
  const collection = await getOrCreateCollection(params.collectionName);
  const results = await collection.query({
    queryEmbeddings: [params.queryEmbedding],
    nResults: params.nResults ?? 5,
    where: params.where,
  });

  const ids = results.ids[0] ?? [];
  const documents = results.documents[0] ?? [];
  const distances = results.distances?.[0] ?? [];
  const metadatas = results.metadatas?.[0] ?? [];

  return ids.map((id, i) => ({
    id,
    document: documents[i] ?? "",
    distance: distances[i] ?? 0,
    metadata: (metadatas[i] ?? {}) as Record<string, string | number | boolean>,
  }));
}

export async function deleteDocuments(collectionName: string, ids: string[]): Promise<void> {
  const collection = await getOrCreateCollection(collectionName);
  await collection.delete({ ids });
}

export async function ping(): Promise<boolean> {
  try {
    await getChromaClient().heartbeat();
    return true;
  } catch {
    return false;
  }
}
