# Backend — A2UI Platform

FastAPI backend for Synapse. Implements `POST /api/agents/knowledge-qa` — a RAG pipeline that streams A2UI v0.9 messages to the frontend.

---

## Quick Start

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
python main.py         # starts on http://localhost:8000
```

Then set `BACKEND_URL=http://localhost:8000` in `frontend/.env.local` to activate the proxy.

---

## Database Setup (Supabase)

### 1. Enable pgvector

In your Supabase project → SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Create the documents table

```sql
CREATE TABLE document_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id     UUID,
  source_file  TEXT NOT NULL,
  upload_date  TIMESTAMP DEFAULT NOW(),
  category     TEXT NOT NULL DEFAULT '',
  tags         TEXT[] DEFAULT ARRAY[]::TEXT[],
  chunk_index  INTEGER,
  content      TEXT NOT NULL,
  embedding    vector(1536),
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### 3. Create the vector search function

```sql
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding    vector(1536),
  match_count        int     DEFAULT 5,
  filter_category    text    DEFAULT NULL,
  filter_date_from   date    DEFAULT NULL,
  filter_date_to     date    DEFAULT NULL
)
RETURNS TABLE (
  id           uuid,
  source_file  text,
  upload_date  timestamp,
  category     text,
  tags         text[],
  chunk_index  int,
  content      text,
  metadata     jsonb,
  similarity   float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.source_file,
    dc.upload_date,
    dc.category,
    dc.tags,
    dc.chunk_index,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE
    (filter_category IS NULL OR dc.category = filter_category)
    AND (filter_date_from IS NULL OR dc.upload_date::date >= filter_date_from)
    AND (filter_date_to IS NULL OR dc.upload_date::date <= filter_date_to)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/agents/knowledge-qa` | RAG query → SSE stream of A2UI messages |
| `GET` | `/health` | Health check |

**Query params for `/api/agents/knowledge-qa`:**
- `query` (required)
- `category` (optional)
- `dateFrom` (optional, YYYY-MM-DD)
- `dateTo` (optional, YYYY-MM-DD)

---

## A2UI Message Sequence

```
Message 1  createSurface     → creates empty surface
Message 2  updateComponents  → answer text + source list
```

Stream closes after Message 2.

---

## Project Layout

```
backend/
├── main.py                      FastAPI entry point + CORS
├── requirements.txt
├── .env.example
├── app/
│   ├── config.py                Env var loading
│   ├── a2ui/
│   │   └── messages.py          A2UI v0.9 message builders
│   └── routes/
│       └── knowledge_qa.py      POST /api/agents/knowledge-qa
└── agents/
    └── knowledge_qa_agent.py    Embed → Search → LLM → sources
```

---

## Test

```bash
# With backend running:
curl -sN -X POST \
  "http://localhost:8000/api/agents/knowledge-qa?query=What+is+RAG" \
  | while IFS= read -r line; do echo "$line" | python -m json.tool; done
```

Expected: 2 JSON lines (`createSurface`, then `updateComponents`).

---

## Session Notes

- **2026-04-09:** Scaffolded v1 backend. Greenfield — no prior backend existed.
  - Implemented: FastAPI app, RAG agent (OpenAI embeddings + Claude + Supabase pgvector), A2UI message builders, proxy integration in Next.js route handler.
  - Next: Run `pip install`, configure `.env`, create Supabase schema, load documents.
  - Blocked on: Supabase project + API keys.
