# TASK.md — Active Task List

Format: `- [x] TASK-NNN: description | Phase: N | Tests: <file>`
Rule: Never mark [x] until the associated tests pass.

---

## Phase 1 — Project Scaffold ✓

- [x] TASK-001: Initialize package.json, tsconfig, eslint, vitest | Phase: 1 | Tests: N/A
- [x] TASK-002: Create docker-compose.yml (PostgreSQL + ChromaDB) + initial SQL migration | Phase: 1 | Tests: N/A
- [x] TASK-003: Set up GitHub Actions CI workflow | Phase: 1 | Tests: N/A
- [x] TASK-004: Create src/ skeleton and passing smoke test | Phase: 1 | Tests: tests/smoke.test.ts ✓

## Phase 2 — Core Abstractions ✓

- [x] TASK-005: Implement PostgreSQL client + connection pool | Phase: 2 | Tests: tests/db/client.test.ts ✓
- [x] TASK-006: Implement ChromaDB client wrapper | Phase: 2 | Tests: tests/vector/client.test.ts ✓
- [x] TASK-007: Implement embedding interface (OpenAI backend) | Phase: 2 | Tests: tests/embed/embedder.test.ts ✓
- [x] TASK-008: Implement embedding interface (Ollama backend) | Phase: 2 | Tests: tests/embed/embedder.test.ts ✓
- [x] TASK-009: Define shared types (Document, SourceConfig, Domain) | Phase: 2 | Tests: tests/types.test.ts ✓

## Phase 3 — Source Adapters ✓

- [x] TASK-010: Text file source adapter | Phase: 3 | Tests: tests/sources/text.test.ts ✓
- [x] TASK-011: PDF source adapter | Phase: 3 | Tests: tests/sources/pdf.test.ts ✓
- [x] TASK-012: Excel source adapter | Phase: 3 | Tests: tests/sources/excel.test.ts ✓
- [x] TASK-013: Web URL source adapter | Phase: 3 | Tests: tests/sources/url.test.ts ✓
- [ ] TASK-014: PostgreSQL source adapter | Phase: 3 | Tests: tests/sources/postgres.test.ts (deferred to Phase 8)
- [ ] TASK-015: Vector passthrough adapter | Phase: 3 | Tests: tests/sources/vector.test.ts (deferred to Phase 8)

## Phase 4 — RAG Pipeline ✓

- [x] TASK-016: Ingest orchestrator | Phase: 4 | Tests: tests/core/pipeline.test.ts ✓
- [x] TASK-017: Retrieval (vector similarity search) | Phase: 4 | Tests: tests/core/pipeline.test.ts ✓
- [x] TASK-018: Re-ranking | Phase: 4 | Tests: tests/core/pipeline.test.ts ✓
- [x] TASK-019: Streaming generation (Claude + Ollama backends) | Phase: 4 | Tests: tests/core/pipeline.test.ts ✓
- [x] TASK-020: End-to-end pipeline test | Phase: 4 | Tests: tests/core/pipeline.test.ts ✓

## Phase 5 — Domain System ✓

- [x] TASK-021: Domain registry + default domain | Phase: 5 | Tests: tests/domains/registry.test.ts ✓
- [x] TASK-022: Medicine and Robotics domain configs | Phase: 5 | Tests: tests/domains/registry.test.ts ✓

## Phase 6 — REST API ✓

- [x] TASK-023: Express server setup + health check | Phase: 6 | Tests: tests/api/api.test.ts ✓
- [x] TASK-024: Chat route with SSE streaming | Phase: 6 | Tests: tests/api/api.test.ts ✓
- [x] TASK-025: Sources CRUD + file upload + URL ingest routes | Phase: 6 | Tests: tests/api/api.test.ts ✓
- [x] TASK-026: Ingest pipeline wired into upload/URL routes | Phase: 6 | Tests: tests/api/api.test.ts ✓
- [x] TASK-027: Domains route | Phase: 6 | Tests: tests/api/api.test.ts ✓

## Phase 7 — Web UI ✓

- [x] TASK-028: Chat UI with SSE streaming (src/web/index.html) | Phase: 7 | Tests: manual ✓
- [x] TASK-029: Source management panel (upload + URL + delete) | Phase: 7 | Tests: manual ✓
- [x] TASK-030: Domain selector | Phase: 7 | Tests: manual ✓

## Phase 8 — Hardening

- [ ] TASK-031: Rate limiting middleware | Phase: 8 | Tests: tests/api/ratelimit.test.ts
- [ ] TASK-032: Embedding cache | Phase: 8 | Tests: tests/embed/cache.test.ts
- [ ] TASK-033: Structured logging (pino) | Phase: 8 | Tests: N/A
- [ ] TASK-034: PostgreSQL source adapter | Phase: 8 | Tests: tests/sources/postgres.test.ts
- [ ] TASK-035: Load test | Phase: 8 | Tests: tests/load/
