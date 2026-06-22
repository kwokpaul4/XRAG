# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XRAG is a multi-source RAG (Retrieval-Augmented Generation) system built on Node.js with PostgreSQL and a local vector database. Users query a web interface; the system retrieves relevant knowledge from heterogeneous sources and augments an LLM response with that context.

The system supports pluggable **knowledge domains** (default: AI; extensible to Chinese Medicine, Robotics, etc.) and pluggable **knowledge sources** (Text files, PDFs, Excel, Web URLs, PostgreSQL tables, Vector DB).

## Tech Stack

- **Runtime**: Node.js (ESM, TypeScript)
- **Web framework**: Express (or Fastify — TBD)
- **LLM**: Claude API via `@anthropic-ai/sdk` (`claude-opus-4-8`, adaptive thinking)
- **Vector DB**: ChromaDB (local, Docker) — primary embedding store
- **Relational DB**: PostgreSQL — structured data, metadata, chat history
- **Embedding model**: `text-embedding-3-small` (OpenAI) or Ollama local model
- **CI/CD**: GitHub Actions
- **Testing**: Vitest
- **Process management**: TASK.md + PHASE.md for project tracking

## Commands

```bash
# Install
npm install

# Development server (with watch)
npm run dev

# Production build
npm run build

# Run all tests
npm test

# Run a single test file
npm test -- src/sources/pdf.test.ts

# Lint
npm run lint

# Type-check
npm run typecheck

# Docker services (PostgreSQL + ChromaDB)
docker compose up -d

# Reset vector DB
npm run db:reset-vectors

# Run DB migrations
npm run db:migrate
```

## Architecture

### Top-level directory layout

```
src/
  api/          Express routes and middleware
  core/         RAG pipeline: retrieval, ranking, generation
  sources/      One file per source type (pdf, text, excel, url, postgres, vector)
  domains/      Domain configurations (AI, medicine, robotics, …)
  embed/        Embedding utilities and chunking strategies
  llm/          Claude API client wrapper, prompt templates
  db/           PostgreSQL client, migrations, schema
  vector/       ChromaDB client wrapper
  web/          Static frontend (HTML/JS/CSS)
tests/          Mirrors src/ structure
infra/
  docker-compose.yml
  migrations/   SQL migration files
```

### RAG Pipeline (core/)

1. **Ingest** — source adapters parse raw content into `Document` chunks
2. **Embed** — chunks are embedded and stored in ChromaDB with metadata
3. **Retrieve** — hybrid search: vector similarity + optional keyword filter
4. **Rank** — re-rank by relevance, domain affinity, recency
5. **Generate** — assemble prompt with context, call Claude, stream response

### Source Adapters (sources/)

Each adapter implements the `SourceAdapter` interface:
```ts
interface SourceAdapter {
  ingest(config: SourceConfig): AsyncIterable<Document>
  supports(mimeType: string): boolean
}
```

| Adapter | Notes |
|---------|-------|
| `text`  | Plain `.txt` files |
| `pdf`   | `pdf-parse` library |
| `excel` | `xlsx` (SheetJS) |
| `url`   | `playwright` or `cheerio` for web scraping |
| `postgres` | SQL query → rows → chunks |
| `vector` | Direct ChromaDB passthrough |

### Domain System (domains/)

A domain is a JSON config that specifies:
- Which collections in ChromaDB to search
- Any domain-specific system prompt additions
- Default source configurations

The `default` domain covers general AI knowledge. New domains are added by dropping a config file into `domains/`.

### LLM Integration (llm/)

Always use `claude-opus-4-8` with `thinking: {type: "adaptive"}`. Streaming is mandatory for all chat responses (`max_tokens: 64000`). The Claude client wrapper handles retries, token budget warnings, and prompt assembly.

## Project Management

### PHASE.md

Tracks high-level development phases. Update when a phase is completed. Format:
```
# Phase N — <Name>
Status: In Progress | Complete
Goal: ...
Deliverables: ...
```

### TASK.md

Active task list. Each task must have a test that passes before the task is marked complete. Format:
```
- [ ] TASK-001: <description> | Phase: N | Tests: <test file>
- [x] TASK-002: <description> | Phase: N | Tests: <test file> ✓
```

**Rule**: Never move a task to `[x]` until its associated tests pass.

## Testing Policy

- Write tests before or alongside implementation (not after)
- Every source adapter must have integration tests against real fixture files
- The RAG pipeline must have end-to-end tests using a test ChromaDB collection
- Run `npm test` before marking any task complete
- CI blocks merges on red tests

## CI/CD

GitHub Actions workflow at `.github/workflows/ci.yml`:
- Runs on every push and PR to `main`
- Steps: install → lint → typecheck → test → build
- Spins up PostgreSQL and ChromaDB as service containers for integration tests

## Environment Variables

Copy `.env.example` to `.env`. Required variables:
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=          # for embeddings (or leave blank to use local Ollama)
POSTGRES_URL=postgresql://localhost:5432/xrag
CHROMA_URL=http://localhost:8000
PORT=3000
NODE_ENV=development
```

## Key Design Decisions

- **Streaming first**: All LLM responses stream to the browser via SSE (`text/event-stream`)
- **Async ingest**: Document ingestion runs outside the request cycle; progress is polled separately
- **Domain isolation**: Each domain maps to its own ChromaDB collection; cross-domain search is opt-in
- **No vendor lock-in on embeddings**: The embed module abstracts over OpenAI and Ollama; swap via env var
- **Test before ship**: Every TASK.md item requires passing tests before close
