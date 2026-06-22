import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Domain } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load all *.json files in this directory as domain configs
function loadDomains(): Map<string, Domain> {
  const map = new Map<string, Domain>();
  const files = readdirSync(__dirname).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const raw = require(join(__dirname, file)) as Domain;
    map.set(raw.name, raw);
  }
  return map;
}

const _domains = loadDomains();

export function getDomain(name: string): Domain {
  const d = _domains.get(name);
  if (!d) throw new Error(`Unknown domain: "${name}". Available: ${listDomains().join(", ")}`);
  return d;
}

export function getDomainOrDefault(name: string): Domain {
  return _domains.get(name) ?? _domains.get("default")!;
}

export function listDomains(): string[] {
  return Array.from(_domains.keys()).sort();
}

export function getAllDomains(): Domain[] {
  return Array.from(_domains.values());
}

/** Return the ChromaDB collection name for a domain (first collection) */
export function collectionForDomain(domain: Domain): string {
  return domain.collections[0];
}
