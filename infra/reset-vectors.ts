#!/usr/bin/env tsx
/**
 * Deletes all ChromaDB collections (for dev reset).
 * Requires ALLOW_RESET=true in the ChromaDB container.
 */
import { ChromaClient } from "chromadb";
import "dotenv/config";

const client = new ChromaClient({ path: process.env.CHROMA_URL ?? "http://localhost:8000" });
await client.reset();
console.log("ChromaDB reset complete.");
