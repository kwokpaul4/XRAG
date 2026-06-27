# XRAG — Multi-Source RAG Knowledge Assistant

A Retrieval-Augmented Generation system that lets you upload documents, scrape URLs, and ask questions — answered by an LLM with context drawn from your own knowledge base.

## Quick start

```bash
git clone https://github.com/kwokpaul4/XRAG.git && cd XRAG
npm install
cp .env.example .env        # fill in API keys (see Configuration below)
docker compose up -d
npm run db:migrate
npm run dev                 # → http://localhost:3001
```

## Supported sources

| Type | Format |
|------|--------|
| Text | `.txt`, `.md` |
| PDF | `.pdf` |
| Excel | `.xlsx`, `.xls` |
| Web | any URL |

## LLM backends

XRAG automatically selects the LLM backend based on your `.env`:

| Priority | Backend | When used |
|----------|---------|-----------|
| 1 | **Claude** (`claude-opus-4-8`, adaptive thinking) | `ANTHROPIC_API_KEY` is set |
| 2 | **Ollama** (local, any model) | `ANTHROPIC_API_KEY` is blank |

For embeddings, `text-embedding-3-small` (OpenAI) is used when `OPENAI_API_KEY` is set, otherwise `nomic-embed-text` via Ollama.

## Configuration

Copy `.env.example` to `.env` and fill in:

```bash
ANTHROPIC_API_KEY=sk-ant-...   # optional — use Claude for generation
OPENAI_API_KEY=sk-...          # optional — use OpenAI for embeddings
OLLAMA_URL=http://localhost:11434   # Ollama base URL (local or remote VM)
OLLAMA_CHAT_MODEL=qwen3.5:4b       # Ollama chat model
```

## Built-in domains

- **General AI** — technology, ML, AI concepts
- **Chinese Medicine** — TCM, acupuncture, herbal medicine
- **Robotics** — ROS, kinematics, automation

Add new domains by dropping a JSON file in `src/domains/` — no code changes needed.

## Tech stack

Node.js · TypeScript · Express · PostgreSQL · ChromaDB · Claude / Ollama · Vitest

## Documentation

See [`docs/operations-manual.md`](docs/operations-manual.md) for the full operations manual.

## Tests

```bash
npm test        # 70 tests across 12 suites
npm run lint
npm run typecheck
```
