# XRAG Operations Manual

**Version**: 0.1.0  
**Stack**: Node.js · PostgreSQL · ChromaDB · Claude API

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Installation & First Run](#3-installation--first-run)
4. [Configuration Reference](#4-configuration-reference)
5. [Running the Server](#5-running-the-server)
6. [Using the Web Interface](#6-using-the-web-interface)
7. [API Reference](#7-api-reference)
8. [Knowledge Sources](#8-knowledge-sources)
9. [Domain System](#9-domain-system)
10. [Adding a New Domain](#10-adding-a-new-domain)
11. [CI/CD](#11-cicd)
12. [Troubleshooting](#12-troubleshooting)
13. [Architecture Overview](#13-architecture-overview)

---

## 1. Overview

XRAG is a multi-source Retrieval-Augmented Generation (RAG) system. Users upload knowledge (text files, PDFs, Excel spreadsheets, web URLs) to a persistent vector store, then query it through a streaming chat interface powered by Claude.

Key capabilities:

| Feature | Details |
|---------|---------|
| Sources | Text, PDF, Excel, URL, PostgreSQL (roadmap), Vector passthrough (roadmap) |
| LLM | Claude (`claude-opus-4-8`, adaptive thinking, streaming) |
| Vector store | ChromaDB (local Docker) |
| Relational DB | PostgreSQL 16 — sessions, messages, source registry |
| Domains | Pluggable (General AI, Chinese Medicine, Robotics, …) |
| UI | Single-page app served from Node, SSE streaming |

---

## 2. Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 20 |
| npm | ≥ 9 |
| Docker + Docker Compose | any recent version |
| Anthropic API key | required |
| OpenAI API key | optional (for embeddings — can use Ollama instead) |

---

## 3. Installation & First Run

```bash
# 1. Clone the repo
git clone https://github.com/kwokpaul4/XRAG.git
cd XRAG

# 2. Install dependencies
npm install

# 3. Create your .env file
cp .env.example .env
# Edit .env and fill in at minimum:
#   ANTHROPIC_API_KEY=sk-ant-...
#   OPENAI_API_KEY=sk-...   (or leave blank to use Ollama)

# 4. Start backing services
docker compose up -d

# 5. Run database migrations
npm run db:migrate

# 6. Start the development server
npm run dev
# → http://localhost:3000
```

---

## 4. Configuration Reference

All configuration is driven by environment variables. Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | No | — | Claude API key. If set, Claude is used for generation. If blank, Ollama is used. |
| `OPENAI_API_KEY` | No | — | OpenAI key for `text-embedding-3-small`. Leave blank to use Ollama embeddings. |
| `OLLAMA_URL` | No | `http://localhost:11434` | Ollama base URL (local or remote). Used for both embeddings and chat when API keys are unset. |
| `OLLAMA_CHAT_MODEL` | No | `qwen3.5:4b` | Ollama chat model for generation (any model installed in Ollama). |
| `POSTGRES_URL` | No | `postgresql://xrag:xrag@localhost:5433/xrag` | PostgreSQL connection string |
| `CHROMA_URL` | No | `http://localhost:8000` | ChromaDB URL |
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `LOG_LEVEL` | No | `info` | `debug` \| `info` \| `warn` \| `error` |

> **Note:** PostgreSQL is mapped to host port **5433** (not 5432) to avoid conflicts with a locally installed Postgres.

---

## 5. Running the Server

### Development (watch mode)
```bash
npm run dev
```
Restarts on file changes via `tsx watch`.

### Production build
```bash
npm run build        # compile TypeScript → dist/
npm start            # run compiled output
```

### Other scripts

| Command | Purpose |
|---------|---------|
| `npm test` | Run all 70 tests |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type-check (no emit) |
| `npm run db:migrate` | Run SQL migrations against `POSTGRES_URL` |
| `npm run db:reset-vectors` | Wipe all ChromaDB collections (requires `ALLOW_RESET=true`) |
| `docker compose up -d` | Start PostgreSQL + ChromaDB |
| `docker compose down` | Stop containers |

---

## 6. Using the Web Interface

Open **http://localhost:3000** in your browser.

### Layout

```
┌──────────────────────────────────────────────────────┐
│ XRAG                              Domain: [General AI▼]│
├──────────────────┬───────────────────────────────────┤
│ Knowledge Sources│                                    │
│ ─────────────────│        Chat messages               │
│ [Upload zone]    │                                    │
│ [+URL input]     │                                    │
│                  │                                    │
│ • source list    │─────────────────────────────────── │
│                  │ [Ask a question…]      [Send]      │
└──────────────────┴───────────────────────────────────┘
```

### Workflow

1. **Select a domain** — top-right dropdown. This determines which ChromaDB collection is searched.
2. **Add knowledge sources** in the sidebar:
   - Drag-and-drop or click the upload zone for `.txt`, `.pdf`, or `.xlsx` files.
   - Paste a URL and click **+URL** to scrape and ingest a web page.
3. **Ask questions** in the input bar. Answers stream token-by-token.
4. **Remove sources** with the ✕ button next to each source.

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in input |

---

## 7. API Reference

Base URL: `http://localhost:3000`

### Health

```
GET /health
→ { "status": "ok", "version": "0.1.0" }
```

### Domains

```
GET /api/domains
→ [{ "name": "default", "displayName": "General AI", "description": "..." }, ...]
```

### Sources

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sources` | List all ingested sources |
| `GET` | `/api/sources/:id` | Get a single source |
| `DELETE` | `/api/sources/:id` | Remove a source |
| `POST` | `/api/sources/url` | Ingest from a URL |
| `POST` | `/api/sources/upload` | Ingest from a file upload |

#### POST /api/sources/url

```json
{
  "url": "https://example.com/article",
  "name": "My Article",       // optional display name
  "domain": "default"         // optional, defaults to "default"
}
```

Response:
```json
{
  "sourceId": "uuid",
  "chunksIngested": 12,
  "errors": []
}
```

#### POST /api/sources/upload

Multipart form data:

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | `.txt`, `.pdf`, `.xlsx`, or `.xls` |
| `domain` | string | Optional, defaults to `"default"` |
| `name` | string | Optional display name |

Response: same shape as `/api/sources/url`.

### Chat

```
POST /api/chat
Content-Type: application/json

{
  "message": "What is machine learning?",
  "domain": "default",       // optional
  "sessionId": "uuid"        // optional, continue a session
}
```

Response: `text/event-stream` (SSE)

```
data: {"token":"Machine "}
data: {"token":"learning "}
data: {"token":"is..."}
data: {"done":true,"sessionId":"uuid"}
```

On error: `data: {"error":"message"}` then stream closes.

---

## 8. Knowledge Sources

### Supported source types

| Type | File extensions | Notes |
|------|----------------|-------|
| Text | `.txt`, `.md`, `.csv`, `.json` (plain text) | Split by chunks of ~512 tokens with 200-char overlap |
| PDF | `.pdf` | Text extracted via `pdf-parse`; each document is chunked |
| Excel | `.xlsx`, `.xls` | Each row becomes one chunk (`key: value | key: value …`) |
| URL | any `https://` URL | HTML stripped; text chunked. JavaScript-rendered pages may not fully load. |

### Chunking strategy

| Parameter | Default | Effect |
|-----------|---------|--------|
| `chunkSize` | 512 tokens (~2048 chars) | Max chunk size before splitting |
| `overlap` | 200 chars | Shared context between adjacent chunks |

### Embeddings

The system uses `text-embedding-3-small` (OpenAI, 1536 dimensions) when `OPENAI_API_KEY` is set, otherwise falls back to `nomic-embed-text` via Ollama (768 dimensions).

> **Important:** Do not mix embedding models within the same ChromaDB collection. If you switch `OPENAI_API_KEY` on/off, run `npm run db:reset-vectors` and re-ingest all sources.

---

## 9. Domain System

Domains isolate knowledge into separate ChromaDB collections and customise the system prompt.

Built-in domains:

| Domain name | Display name | Collection | Use case |
|-------------|-------------|------------|----------|
| `default` | General AI | `xrag-default` | AI, ML, technology |
| `medicine` | Chinese Medicine | `xrag-medicine` | TCM, acupuncture, herbal medicine |
| `robotics` | Robotics | `xrag-robotics` | ROS, kinematics, automation |

Each domain lives as a JSON file in `src/domains/`.

---

## 10. Adding a New Domain

1. Create `src/domains/<name>.json`:

```json
{
  "name": "finance",
  "displayName": "Finance",
  "description": "Financial analysis, markets, and accounting.",
  "collections": ["xrag-finance"],
  "systemPromptAddendum": "You specialise in financial analysis and investment. Always clarify that responses are not financial advice."
}
```

2. Restart the server (`npm run dev`). The new domain appears automatically in the UI and API.

3. Ingest sources with `"domain": "finance"` via the API or UI.

No code changes are required.

---

## 11. CI/CD

GitHub Actions runs on every push and pull request to `main`.

### Pipeline steps

1. **Install** — `npm ci`
2. **Lint** — ESLint with typescript-eslint
3. **Type-check** — `tsc --noEmit`
4. **Migrate** — runs SQL migrations against a service container
5. **Test** — Vitest (70 tests)
6. **Build** — `tsc -p tsconfig.build.json`

### Required secrets (GitHub repo settings)

| Secret | Description |
|--------|-------------|
| `ANTHROPIC_API_KEY` | Used in integration tests that call Claude |
| `OPENAI_API_KEY` | Used in embedding tests (optional — tests mock by default) |

### Service containers (auto-provisioned in CI)

- `postgres:16-alpine` on port 5432
- `chromadb/chroma:latest` on port 8000

---

## 12. Troubleshooting

### Running fully locally with Ollama (no API keys needed)

```bash
# 1. Install Ollama: https://ollama.com
# 2. Pull required models
ollama pull nomic-embed-text   # embeddings (~270MB)
ollama pull qwen3.5:4b         # chat generation (~2.3GB)

# 3. Start Ollama (bind to all interfaces if running on a remote/VM host)
OLLAMA_HOST=0.0.0.0 ollama serve

# 4. Set .env
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OLLAMA_URL=http://<ollama-host>:11434
OLLAMA_CHAT_MODEL=qwen3.5:4b
```

### Running Ollama on a VMware Fusion VM

If Ollama is installed on a Linux VM (e.g. Ubuntu in VMware Fusion) and XRAG runs on the Mac host, follow these steps:

**1. Stop the system Ollama service (it binds to localhost only)**

```bash
sudo systemctl stop ollama
sudo systemctl disable ollama
```

**2. Start Ollama bound to all network interfaces**

```bash
# Run in background — survives terminal close
nohup env OLLAMA_HOST=0.0.0.0 ollama serve > ~/ollama.log 2>&1 &
```

**3. Pull the required models (if not already done)**

```bash
ollama pull nomic-embed-text   # ~270MB — for embeddings
ollama pull qwen3.5:4b         # ~2.3GB — for chat generation
```

**4. Allow port 11434 through the VM firewall**

```bash
# Ubuntu with ufw
sudo ufw allow 11434

# CentOS/RHEL with firewalld
sudo firewall-cmd --add-port=11434/tcp --permanent
sudo firewall-cmd --reload
```

**5. Find the VM's IP address**

```bash
ip addr show | grep "inet " | grep -v 127
# Example output: inet 192.168.15.131/24 ...
```

> **Note:** The VM's IP may change on each reboot (DHCP). Set a static IP in VMware Fusion network settings to avoid updating `.env` each time:  
> VMware Fusion → Preferences → Network → select the vmnet → DHCP → add a static mapping for the VM's MAC address.

**6. Verify from the Mac host**

```bash
curl http://<vm-ip>:11434/api/tags
# Should return JSON with your installed models
```

**7. Update `.env` on the Mac**

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OLLAMA_URL=http://<vm-ip>:11434
OLLAMA_CHAT_MODEL=qwen3.5:4b
```

Restart `npm run dev` — XRAG will now use the VM's Ollama for both embeddings and chat.

### Server won't start — "password authentication failed"

Your local PostgreSQL (port 5432) is conflicting. The Docker container maps to port **5433**. Ensure your `.env` has:
```
POSTGRES_URL=postgresql://xrag:xrag@localhost:5433/xrag
```

### "Unknown domain: …"

The domain name in your request doesn't match any JSON file in `src/domains/`. Check `GET /api/domains` for valid names.

### Embeddings fail with "Country, region, or territory not supported"

OpenAI's embedding API is geo-restricted. Options:
1. Use a VPN.
2. Unset `OPENAI_API_KEY` and run `ollama pull nomic-embed-text` for local embeddings.

### ChromaDB returns empty results after re-ingesting

If you switched embedding models, the vector dimensions differ. Reset and re-ingest:
```bash
npm run db:reset-vectors
# Then re-upload your sources via the UI or API
```

### Chat gives irrelevant answers

- Verify sources were ingested: `GET /api/sources` should list them.
- Make sure the selected **domain** in the UI matches where you ingested the documents.
- Try a more specific question.

### docker compose up fails — port already in use

Port 5432 is taken by a local Postgres. The Docker Compose file already maps to 5433 — just make sure `.env` reflects that.

---

## 13. Architecture Overview

```
Browser
  │ SSE / fetch
  ▼
Express (src/server.ts)
  ├── POST /api/chat     ──→ retrieve() → rank() → generateStream()
  ├── POST /api/sources  ──→ ingest()
  └── GET  /api/domains  ──→ domain registry

Core pipeline (src/core/)
  ingest.ts   : SourceAdapter → chunkText → embed → ChromaDB + PostgreSQL
  retrieve.ts : embed query → ChromaDB vector search
  rank.ts     : domain boost + length penalty → sorted top-N
  generate.ts : context assembly → Claude streaming API

Source adapters (src/sources/)
  text.ts   pdf.ts   excel.ts   url.ts

Embed (src/embed/)
  OpenAIEmbedder  │  OllamaEmbedder  (selected by env)

Storage
  ChromaDB   ← vector embeddings + document text
  PostgreSQL ← sources registry, documents mirror, sessions, messages

Domains (src/domains/*.json)
  default.json   medicine.json   robotics.json   (add more anytime)
```

### Data flow: ingest

```
File / URL
    │
SourceAdapter.ingest()
    │ yields Document chunks
chunkText()  (512 tok, 200 char overlap)
    │
Embedder.embed(chunks)
    │ float[][]
upsertDocuments() → ChromaDB
    +
INSERT INTO documents → PostgreSQL
```

### Data flow: query

```
User message
    │
Embedder.embed([query])
    │
ChromaDB.query()  nResults=8
    │ RetrievedChunk[]
rank()  domain boost + length filter  top-5
    │
Claude claude-opus-4-8
  system: domain prompt + <context> block
  stream: token deltas → SSE → browser
    │
INSERT INTO messages (session)
```
