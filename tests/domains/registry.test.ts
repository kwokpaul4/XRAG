import { describe, it, expect } from "vitest";
import {
  getDomain,
  getDomainOrDefault,
  listDomains,
  getAllDomains,
  collectionForDomain,
} from "../../src/domains/index.js";

describe("domains/registry", () => {
  it("lists known domains", () => {
    const domains = listDomains();
    expect(domains).toContain("default");
    expect(domains).toContain("medicine");
    expect(domains).toContain("robotics");
  });

  it("getDomain returns correct config for default", () => {
    const d = getDomain("default");
    expect(d.name).toBe("default");
    expect(d.displayName).toBe("General AI");
    expect(d.collections.length).toBeGreaterThan(0);
  });

  it("getDomain returns correct config for medicine", () => {
    const d = getDomain("medicine");
    expect(d.name).toBe("medicine");
    expect(d.systemPromptAddendum).toBeDefined();
    expect(d.systemPromptAddendum).toContain("Chinese Medicine");
  });

  it("getDomain throws for unknown domain", () => {
    expect(() => getDomain("nonexistent")).toThrow(/Unknown domain/);
  });

  it("getDomainOrDefault falls back to default for unknown name", () => {
    const d = getDomainOrDefault("doesnotexist");
    expect(d.name).toBe("default");
  });

  it("getAllDomains returns all loaded domains", () => {
    const all = getAllDomains();
    expect(all.length).toBeGreaterThanOrEqual(3);
    const names = all.map((d) => d.name);
    expect(names).toContain("default");
    expect(names).toContain("medicine");
    expect(names).toContain("robotics");
  });

  it("collectionForDomain returns the first collection", () => {
    const d = getDomain("default");
    const col = collectionForDomain(d);
    expect(typeof col).toBe("string");
    expect(col.length).toBeGreaterThan(0);
  });
});
