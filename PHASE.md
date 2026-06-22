# PHASE.md — XRAG Development Roadmap

---

## Phase 1 — Project Scaffold
**Status**: Complete ✓
**Goal**: Green baseline: `npm install && docker compose up -d && npm test` passes with zero code written.
**Deliverables**:
- [x] package.json, tsconfig, eslint, vitest
- [x] docker-compose.yml (PostgreSQL + ChromaDB)
- [x] GitHub Actions CI workflow
- [x] Initial SQL schema / migration
- [x] src/ skeleton with smoke test passing

---

## Phase 2 — Core Abstractions
**Status**: Complete ✓
**Goal**: Define interfaces and implement the DB + vector clients so the rest of the codebase can build on them.
**Deliverables**:
- [x] `src/db/` — PostgreSQL client + query helpers
- [x] `src/vector/` — ChromaDB client wrapper
- [x] `src/embed/` — embedding interface (OpenAI + Ollama backends)
- [x] `src/types.ts` — shared `Document`, `SourceConfig`, `Domain` types
- [x] Unit tests for each module (using test DB / test ChromaDB collection)

---

## Phase 3 — Source Adapters
**Status**: Complete ✓
**Goal**: Ingest documents from all supported source types.
**Deliverables**:
- [x] `src/sources/text.ts` — plain text files
- [x] `src/sources/pdf.ts` — PDF via pdf-parse
- [x] `src/sources/excel.ts` — Excel via SheetJS
- [x] `src/sources/url.ts` — web scraping via cheerio
- [ ] `src/sources/postgres.ts` — SQL table → chunks (deferred to Phase 8)
- [ ] `src/sources/vector.ts` — passthrough / re-index (deferred to Phase 8)
- [x] Integration tests per adapter (fixture files in tests/fixtures/)

---

## Phase 4 — RAG Pipeline
**Status**: Complete ✓
**Goal**: End-to-end retrieval and generation pipeline.
**Deliverables**:
- [x] `src/core/ingest.ts` — orchestrate source → embed → store
- [x] `src/core/retrieve.ts` — vector similarity search
- [x] `src/core/rank.ts` — re-rank retrieved chunks
- [x] `src/core/generate.ts` — assemble prompt, call Claude, stream response
- [x] `src/llm/client.ts` — Claude API wrapper (streaming, adaptive thinking)
- [x] End-to-end pipeline test

---

## Phase 5 — Domain System
**Status**: Complete ✓
**Goal**: Pluggable domains that isolate collections and customize prompts.
**Deliverables**:
- [x] `src/domains/index.ts` — domain registry
- [x] `src/domains/default.json` — general AI domain
- [x] `src/domains/medicine.json` — Chinese Medicine domain
- [x] `src/domains/robotics.json` — Robotics domain
- [x] Domain resolution in retrieval and generation

---

## Phase 6 — REST API + Web UI
**Status**: Complete ✓
**Goal**: HTTP API consumed by the web frontend.
**Deliverables**:
- [x] `src/api/routes/chat.ts` — POST /api/chat (SSE streaming)
- [x] `src/api/routes/sources.ts` — file upload + URL ingest + CRUD
- [x] `src/api/routes/domains.ts` — GET /api/domains
- [x] `src/server.ts` — Express app entry point
- [x] `src/web/index.html` — Chat UI with SSE streaming, source mgmt, domain selector
- [x] API integration tests (70 total tests passing)

---

## Phase 8 — Hardening & Performance
**Status**: Pending
**Goal**: Production-ready reliability.
**Deliverables**:
- [ ] Rate limiting and auth middleware
- [ ] Chunking strategy tuning (size, overlap)
- [ ] Embedding caching (avoid re-embedding unchanged docs)
- [ ] Structured logging (pino)
- [ ] Health-check endpoint
- [ ] Load test
