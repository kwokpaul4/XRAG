import { describe, it, expect } from "vitest";
import type { Document, SourceConfig, Domain, RetrievedChunk, ChatMessage } from "../../src/types.js";

describe("types", () => {
  it("Document type is structurally valid", () => {
    const doc: Document = {
      id: "abc",
      sourceId: "src-1",
      chunkIndex: 0,
      content: "hello",
      metadata: { page: 1 },
    };
    expect(doc.id).toBe("abc");
    expect(doc.chunkIndex).toBe(0);
  });

  it("SourceConfig accepts all source types", () => {
    const types = ["text", "pdf", "excel", "url", "postgres", "vector"] as const;
    for (const type of types) {
      const cfg: SourceConfig = { id: "1", name: "test", type, domain: "default", config: {} };
      expect(cfg.type).toBe(type);
    }
  });

  it("Domain type is structurally valid", () => {
    const domain: Domain = {
      name: "default",
      displayName: "General AI",
      description: "General AI knowledge",
      collections: ["ai-docs"],
    };
    expect(domain.collections).toHaveLength(1);
  });

  it("RetrievedChunk has score", () => {
    const chunk: RetrievedChunk = {
      document: { id: "1", sourceId: "s1", chunkIndex: 0, content: "text", metadata: {} },
      score: 0.95,
    };
    expect(chunk.score).toBeCloseTo(0.95);
  });

  it("ChatMessage roles are constrained", () => {
    const roles: ChatMessage["role"][] = ["user", "assistant", "system"];
    for (const role of roles) {
      const msg: ChatMessage = { role, content: "hi" };
      expect(msg.role).toBe(role);
    }
  });
});
