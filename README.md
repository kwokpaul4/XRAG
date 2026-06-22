# XRAG — Multi-Source RAG Knowledge Assistant

A Retrieval-Augmented Generation system that lets you upload documents, scrape URLs, and ask questions — answered by Claude with context drawn from your own knowledge base.

## Quick start

```bash
git clone https://github.com/kwokpaul4/XRAG.git && cd XRAG
npm install
cp .env.example .env        # fill in ANTHROPIC_API_KEY
docker compose up -d
npm run db:migrate
npm run dev                 # → http://localhost:3000
```

## Supported sources

| Type | Format |
|------|--------|
| Text | `.txt`, `.md` |
| PDF | `.pdf` |
| Excel | `.xlsx`, `.xls` |
| Web | any URL |

## Built-in domains

- **General AI** — technology, ML, AI concepts  
- **Chinese Medicine** — TCM, acupuncture, herbal medicine  
- **Robotics** — ROS, kinematics, automation  

Add new domains by dropping a JSON file in `src/domains/` — no code changes needed.

## Tech stack

Node.js · TypeScript · Express · PostgreSQL · ChromaDB · Claude (`claude-opus-4-8`) · Vitest

## Documentation

See [`docs/operations-manual.md`](docs/operations-manual.md) for the full operations manual.

## Tests

```bash
npm test        # 70 tests across 12 suites
npm run lint
npm run typecheck
```
