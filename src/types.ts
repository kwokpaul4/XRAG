/**
 * Shared types used throughout XRAG.
 */

export type SourceType = "text" | "pdf" | "excel" | "url" | "postgres" | "vector";

export interface Document {
  id: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
  vectorId?: string;
}

export interface SourceConfig {
  id: string;
  name: string;
  type: SourceType;
  domain: string;
  config: Record<string, unknown>;
}

export interface Domain {
  name: string;
  displayName: string;
  description: string;
  collections: string[];
  systemPromptAddendum?: string;
}

export interface RetrievedChunk {
  document: Document;
  score: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}
