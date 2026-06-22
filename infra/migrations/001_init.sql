-- 001_init.sql
-- Initial schema for XRAG

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Knowledge sources registry
CREATE TABLE IF NOT EXISTS sources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('text','pdf','excel','url','postgres','vector')),
  domain      TEXT NOT NULL DEFAULT 'default',
  config      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document chunks (mirrors what is in ChromaDB, for auditing)
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id   UUID REFERENCES sources(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content     TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  vector_id   TEXT,                          -- ChromaDB document ID
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat sessions
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain      TEXT NOT NULL DEFAULT 'default',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content     TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_source_id   ON documents(source_id);
CREATE INDEX IF NOT EXISTS idx_documents_vector_id   ON documents(vector_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id   ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_sources_domain        ON sources(domain);
