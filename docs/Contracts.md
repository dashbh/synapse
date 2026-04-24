# Frontend ↔ Backend Contract Specification

**Protocol:** A2UI v0.9 over SSE  
**Last Updated:** April 2026  
**Status:** MVP Complete

---

## 1. Request Specification

**Frontend sends:**

```
POST /api/agents/knowledge-qa?query=<string>&surface_id=<uuid>[&session_id=<uuid>]
```

Parameters are in the **URL query string** (no request body). The `useAgentStream` hook builds the URL with `URLSearchParams` and calls `fetch()` as a POST with no body.

**Query Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `query` | ✅ | User question string |
| `surface_id` | ✅ | FE-generated UUID per turn, format: `qa-turn-<uuid>`. Backend echoes this in both messages. |
| `session_id` | optional | UUID of the active session. Omit for a stateless (no-history) query. |

**Example:**
```bash
curl -sN -X POST \
  "http://localhost:8000/api/agents/knowledge-qa?query=What+is+RAG&surface_id=qa-turn-abc123&session_id=550e8400-e29b-41d4-a716-446655440000"
```

**Response Headers (what FE expects):**
```
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Cache-Control: no-cache, no-store
X-Accel-Buffering: no
X-Trace-ID: <32-hex>
```

`X-Trace-ID` is the backend OTel trace ID. FE attaches it to all subsequent stream log lines for cross-service correlation.

---

## 2. Response Specification (Exact Message Sequence)

Backend MUST send exactly **2** newline-delimited JSON messages in this order:

**Protocol:** A2UI v0.9  
**Library:** `@a2ui/web_core/v0_9` — supported message types: `createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`. There is no `render` message type.

### Message 1: createSurface

Registers a new surface. Sent immediately — client can render a skeleton before RAG completes.

```json
{
  "version": "v0.9",
  "createSurface": {
    "surfaceId": "qa-turn-abc123",
    "catalogId": "stub"
  }
}
```

**Constraints:**
- `version` must be `"v0.9"`
- `surfaceId` must match the `surface_id` query param sent by FE
- `catalogId` must be `"stub"`
- No `components` field — `createSurface` only registers the surface

### Message 2: updateComponents

Sent after the full LLM response is buffered. Contains all components in one shot.

All Knowledge-QA responses use the **Architect's Triad** format: three sections rendered via `Text` (h2) + `Markdown` pairs, followed by a `SourceList`.

```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "qa-turn-abc123",
    "components": [
      {
        "id": "blueprint-label",
        "component": "Text",
        "text": "The Blueprint",
        "usageHint": "h2"
      },
      {
        "id": "blueprint-body",
        "component": "Markdown",
        "content": "RAG (Retrieval-Augmented Generation) is a technique that combines a retrieval step..."
      },
      {
        "id": "ripple-label",
        "component": "Text",
        "text": "The Systemic Ripple",
        "usageHint": "h2"
      },
      {
        "id": "ripple-body",
        "component": "Markdown",
        "content": "Introducing RAG into a system changes the latency profile significantly..."
      },
      {
        "id": "boundary-label",
        "component": "Text",
        "text": "The Boundary Condition",
        "usageHint": "h2"
      },
      {
        "id": "boundary-body",
        "component": "Markdown",
        "content": "RAG degrades when the retrieval corpus is stale or the similarity threshold is too low..."
      },
      {
        "id": "sources-list",
        "component": "SourceList",
        "sources": [
          {
            "id": "uuid-here",
            "title": "Introduction to RAG",
            "excerpt": "RAG combines a retrieval mechanism with a language model...",
            "score": 0.92,
            "document": "ai-fundamentals.pdf",
            "section": "Chapter 3: Retrieval Methods",
            "date": "2025-11-15",
            "category": "AI/ML",
            "url": "https://docs.example.com/rag-intro"
          }
        ]
      }
    ]
  }
}
```

**Constraints:**
- `version` must be `"v0.9"`
- `surfaceId` must match Message 1
- `components` is a **full replacement array** — send all components with their final values
- Each component has `id` (unique within surface), `component` (type string), and type-specific props
- Stream closes after this message
- Full `updateComponents` payload is stored as `a2ui_payload JSONB` in `messages` table for session hydration

---

## 3. Timing & Stream Management

| Phase | Timing | What Happens |
|-------|--------|--------------|
| **Connection opens** | T+0ms | FE opens SSE stream |
| **Message 1 sent** | T+0ms | Backend sends `createSurface` immediately |
| **Message 2 sent** | T+1–30s | After embed + vector search + LLM completes |
| **Stream closes** | After Message 2 | Connection closes; FE renders from MessageProcessor state |
| **Total duration** | 1–30s | Dominated by LLM latency |

**Frontend timeout:** If stream does not complete within T+30s, FE shows: "Query took too long"

---

## 4. Component Props & Supported Values

Props are flat key-value pairs on the component object:

```json
{
  "id": "my-component",
  "component": "Button",
  "label": "Click me",
  "variant": "primary"
}
```

### Prop Types

| Type | Example | Usage |
|------|---------|-------|
| String | `"label": "Submit"` | Text labels, content |
| Number | `"score": 0.95` | Similarity scores |
| Boolean | `"disabled": false` | Component states |
| Array | `"sources": [...]` | Lists (SourceList) |
| Object | `{ "title": "...", "url": "..." }` | Structured data |

### Full Replacement Semantics

`updateComponents` sends the **complete** component array on every call — no incremental patch. Each component object contains all its final prop values.

---

## 5. Supported Component Types

| Type | Required Props | Optional Props | Notes |
|------|---------------|----------------|-------|
| **Text** | `text` | `usageHint` | Headings and paragraphs |
| **Markdown** | `content` | — | Markdown body; `[N]` patterns → clickable citation badges |
| **Card** | `childIds` | `title` | Container for grouped components |
| **Button** | `label` | `variant` | User interaction |
| **Badge** | `label` | `variant` | Status / metadata display |
| **SourceList** | `sources` | — | Citation strip; registers sources for Drawer |
| **MetadataCard** | `document`, `section`, `date`, `category` | — | Structured source metadata grid |

**Text `usageHint` values:** `h1` / `h2` / `h3` / `body` / `caption`

**Button `variant` values:** `secondary` (outlined grey) or omit for primary blue gradient

**Badge `variant` values:** `default` (blue-tinted), `secondary` (violet-tinted), `destructive` (red-tinted), `outline` (transparent ring)

### SourceList Source Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Chunk UUID from database |
| `title` | string | Document filename or display title |
| `excerpt` | string | Content snippet (~400 chars) |
| `score` | number | Cosine similarity (0–1) |
| `document` | string | Source filename (e.g. `api-guide.pdf`) |
| `section` | string | Document section or heading |
| `date` | string | Upload date `YYYY-MM-DD` |
| `category` | string | User-defined category |
| `url` | string | Link to source document |

---

## 6. Error Handling

### Backend Errors Before Message 2

Close stream with HTTP error code (400, 500). FE shows: "Something went wrong. Retry?"

### Backend Errors During RAG/LLM

Send Message 1 normally, then Message 2 with an error `Text` component:

```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "qa-turn-abc123",
    "components": [
      { "id": "error-label", "component": "Text", "text": "Error", "usageHint": "h2" },
      { "id": "error-body", "component": "Text", "text": "Could not complete your query. Please try again.", "usageHint": "body" }
    ]
  }
}
```

### Frontend Error Responses

| Condition | FE Behaviour |
|-----------|-------------|
| Network error | "Connection failed" |
| Timeout (30s) | "Query took too long" |
| Invalid JSON | console error + "Render failed" |
| Unknown component type | console warning + partial render |

---

## 7. Testing This Contract

```bash
# Direct backend test (2-message flow)
curl -sN -X POST \
  "http://localhost:8000/api/agents/knowledge-qa?query=What+is+RAG&surface_id=qa-turn-test-001"

# Expected output (2 newline-delimited JSON lines):
# {"version":"v0.9","createSurface":{"surfaceId":"qa-turn-test-001","catalogId":"stub"}}
# {"version":"v0.9","updateComponents":{"surfaceId":"qa-turn-test-001","components":[...]}}

# Through Next.js proxy (requires BACKEND_URL in frontend/.env.local):
curl -sN -X POST \
  "http://localhost:3000/api/agents/knowledge-qa?query=What+is+RAG&surface_id=qa-turn-test-001"

# With session context:
curl -sN -X POST \
  "http://localhost:8000/api/agents/knowledge-qa?query=What+is+RAG&surface_id=qa-turn-test-001&session_id=<uuid>"
```

---

## 8. Version & Compatibility

- **Protocol:** A2UI v0.9
- **Transport:** HTTP/1.1 POST, newline-delimited JSON stream (`text/plain; charset=utf-8`)
- **Backcompat:** New component types added as optional. FE warns on unknown types.
- **Breaking change:** Removing a required field requires notifying both FE and BE.

---

## 9. Implementation Checklist

Backend verification:

- [ ] `createSurface` sent before any LLM call
- [ ] `updateComponents` sent after full response is ready
- [ ] Both messages carry `"version": "v0.9"`
- [ ] `surfaceId` in both messages matches the `surface_id` query param
- [ ] `createSurface` has NO `components` field
- [ ] `updateComponents` uses `components[]` (full array, not patch)
- [ ] `session_id` param read and passed to RAG pipeline for history context
- [ ] Component prop names match exactly: `text` + `usageHint` (Text), `content` (Markdown), `label` (Button/Badge), `childIds` (Card), `sources` (SourceList)
- [ ] Component IDs unique within surface
- [ ] SourceList `sources` fields populated: `id`, `title`, `excerpt`, `score`, `document`, `section`, `date`, `category`
- [ ] Full `updateComponents` JSON stored as `a2ui_payload JSONB` in `messages` table
- [ ] Total time < 30s
- [ ] Error cases handled: HTTP error before stream, or error `Text` in Message 2
- [ ] Tested with curl template above

---

## 10. Ingestion Contract (Knowledge-QA)

**What:** Backend accepts document files for ingestion into the Knowledge-QA vector store.  
**Auth:** Admin-protected. Current implementation uses a mock bypass — real OAuth deferred (see [Roadmap.md](Roadmap.md)).

### Request

```
POST /api/agents/ingest
Content-Type: multipart/form-data

Form Data:
- file: <single file> (PDF, DOCX, TXT, MD)
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/agents/ingest" \
  -F "file=@api-guide.pdf"
```

### Response (SSE Stream)

Newline-delimited JSON, one message per step:

```json
{ "step": "<step-name>", "status": "<status>", "message": "<human-readable>" }
```

**Steps (in order):** `upload` → `parsing` → `chunking` → `embedding` → `storing`

**Status values:** `idle` / `in_progress` / `done` / `error`

**Example stream:**
```json
{"step": "upload",    "status": "done",        "message": "api-guide.pdf received (2.3 MB)"}
{"step": "parsing",   "status": "in_progress", "message": "Extracting text..."}
{"step": "parsing",   "status": "done",        "message": "Extracted 15,432 bytes"}
{"step": "chunking",  "status": "done",        "message": "Created 28 chunks"}
{"step": "embedding", "status": "done",        "message": "Generated 28 embeddings"}
{"step": "storing",   "status": "done",        "message": "Stored 28 chunks"}
```

**Frontend progress calculation:**

| Step | Weight |
|------|--------|
| upload | 10% |
| parsing | 20% |
| chunking | 20% |
| embedding | 35% |
| storing | 15% |

**Timing:** No fixed timeout per step. FE timeout: T+5min overall.

**Error handling:** If a step fails (`status: "error"`), stream remaining steps. FE shows error inline; user can retry.

---

## 11. Data Model Schema (Knowledge-QA)

### document_chunks

```sql
CREATE TABLE document_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content     TEXT NOT NULL,
  embedding   VECTOR(1536) NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',  -- { source, date, category, section, url }
  source_file TEXT NOT NULL,                -- original filename; used for dedup on re-upload
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`metadata` JSONB shape (set at ingest time):
```json
{
  "source":   "api-guide.pdf",
  "date":     "2025-11-15",
  "category": "AI/ML",
  "section":  "Chapter 3",
  "url":      "https://docs.example.com/rag"
}
```

**Dedup:** `DELETE FROM document_chunks WHERE source_file = '{filename}'` runs before INSERT on every re-upload.

### sessions + messages

```sql
CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL DEFAULT 'New Session',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT,         -- raw query text (user turns)
  a2ui_payload JSONB,        -- full updateComponents payload (assistant turns)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_session ON messages(session_id, created_at);
```

### Ingestion Pipeline (Backend Responsibility)

| Step | Tool | Config |
|------|------|--------|
| Parse PDF | pypdf | page-by-page extraction |
| Parse DOCX | python-docx | paragraph extraction |
| Parse TXT/MD | direct read | — |
| Chunk | `RecursiveCharacterTextSplitter` | `chunk_size=1000`, `chunk_overlap=200` (characters) |
| Embed | OpenAI `text-embedding-ada-002` | batched; returns `vector(1536)` per chunk |
| Search | `match_document_chunks` RPC | `embedding <#> query_vector` (negative inner product / cosine) |

---

## 12. Backlog

Not yet implemented:

- Pagination: `cursor` param for loading more results
- Button mutations: ButtonComponent sends clicks back to backend
- Real-time multi-turn streaming: multiple `updateComponents` per query
- FormComponent type for data collection
- TableComponent type for data display
