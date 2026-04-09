# Frontend ↔ Backend Contract Specification

**Version:** 1.1  
**Protocol:** A2UI v0.9 over SSE  
**Last Updated:** April 9, 2026  
**Status:** Active (FE + BE implemented)

---

## 1. Request Specification

**Frontend sends:**

```
POST /api/agents/knowledge-qa?query=<user-question-string>[&category=<category>][&dateFrom=<YYYY-MM-DD>][&dateTo=<YYYY-MM-DD>]
```

Parameters are in the **URL query string** (no request body). The `useAgentStream` hook builds the URL with `URLSearchParams` and calls `fetch()` as a POST with no body.

**Example:**
```bash
curl -sN -X POST \
  "http://localhost:8000/api/agents/knowledge-qa?query=What+is+machine+learning&category=AI%2FML&dateFrom=2025-01-01&dateTo=2026-12-31"
```

**Query Parameters:**
- `query` (required): User question string
- `category` (optional): Filter by document category (e.g., "AI/ML", "Architecture", "Security")
- `dateFrom` (optional): Filter documents from this date (YYYY-MM-DD). Inclusive.
- `dateTo` (optional): Filter documents up to this date (YYYY-MM-DD). Inclusive.

Filters are applied with AND logic: results must match query AND all specified filters.

**Response Headers (what FE expects):**
```
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Cache-Control: no-cache, no-store
X-Accel-Buffering: no
```

---

## 2. Response Specification (Exact Message Sequence)

Backend MUST send exactly **2** newline-delimited JSON messages in this order:

**Protocol:** A2UI v0.9  
**Library:** `@a2ui/web_core/v0_9` — supported message types: `createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`. There is no `render` message type in the library.

### Message 1: createSurface

Registers a new surface. No component definitions — those come in Message 2.

```json
{
  "version": "v0.9",
  "createSurface": {
    "surfaceId": "qa-result",
    "catalogId": "stub"
  }
}
```

**Constraints:**
- Must have `version: "v0.9"`
- Must have `surfaceId` (unique per stream)
- Must have `catalogId` (`"stub"` for this version)
- No `components` field — `createSurface` only registers the surface

### Message 2: updateComponents (Full Component Definitions + Data)

Sent ~350ms after Message 1. Defines all components with their final content in one shot.

```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "qa-result",
    "components": [
      {
        "id": "answer-label",
        "component": "Text",
        "text": "Answer",
        "usageHint": "h2"
      },
      {
        "id": "answer-body",
        "component": "Text",
        "text": "Machine learning is a subset of AI where systems learn from data without explicit programming.",
        "usageHint": "body"
      },
      {
        "id": "sources-label",
        "component": "Text",
        "text": "Sources",
        "usageHint": "h3"
      },
      {
        "id": "sources-list",
        "component": "SourceList",
        "sources": [
          {
            "id": "uuid-here",
            "title": "Introduction to Machine Learning",
            "excerpt": "ML is a branch of artificial intelligence focused on enabling computers to learn from experience...",
            "score": 0.92,
            "document": "ai-fundamentals.pdf",
            "section": "Chapter 3: Retrieval Methods",
            "date": "2025-11-15",
            "category": "AI/ML",
            "url": "https://docs.example.com/ml-intro"
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
- Each component has `id` (unique within surface), `component` (type string), and type-specific props as flat key-value pairs
- Stream closes after this message

---

## 3. Timing & Stream Management

| Phase | Timing | What Happens |
|---|---|---|
| **Connection opens** | T+0ms | FE opens stream to endpoint |
| **Message 1 sent** | T+0ms | Backend sends `createSurface` |
| **Message 2 sent** | T+350ms | Backend sends `updateComponents` (after RAG completes) |
| **Stream closes** | T+350ms+ | Connection closes; FE renders from processor state |
| **Total duration** | 1–30s | Dominated by embedding + vector search + LLM latency |

**Frontend timeout:** If stream does not complete within T+30s, FE shows error: "Query took too long"

---

## 4. Component Props & Supported Values

### Prop Assignment in updateComponents

Props are set as flat key-value pairs on the component object inside the `components` array:

```json
{
  "id": "my-button",
  "component": "Button",
  "label": "Click me",
  "variant": "primary"
}
```

### Prop Types

| Type | Example | Usage |
|---|---|---|
| String | `"label": "Submit"` | Text labels, content |
| Number | `"score": 0.95` | Similarity scores, indices |
| Boolean | `"disabled": false` | Component states |
| Array | `"sources": [...]` | Lists of objects (SourceList, Card children) |
| Object | `{ title: "...", url: "..." }` | Structured data (source items, metadata) |

### Full Replacement Semantics

`updateComponents` sends the **complete** component array on every call — there is no incremental patch mechanism. Each component object contains all its final prop values.

---

## 5. Supported Component Types

Frontend can render these A2UI component types:

| Type | Required Props | Optional Props | Example |
|---|---|---|---|
| **Text** | `text` | `usageHint` | `{ "component": "Text", "text": "Hello", "usageHint": "h1" }` |
| **Card** | `childIds` | `title` | `{ "component": "Card", "title": "Details", "childIds": ["id1", "id2"] }` |
| **Button** | `label` | `variant` | `{ "component": "Button", "label": "Submit", "variant": "primary" }` |
| **Badge** | `label` | `variant` | `{ "component": "Badge", "label": "Status", "variant": "success" }` |
| **SourceList** | `sources` | — | `{ "component": "SourceList", "sources": [{ "id": "...", "title": "...", "excerpt": "...", "score": 0.9, "document": "...", "section": "...", "date": "YYYY-MM-DD", "category": "...", "url": "..." }] }` |

**Text `usageHint` values:**
- `h1` → large heading
- `h2` → medium heading
- `h3` → small heading
- `body` → normal paragraph text
- `caption` → small grey text

**Button `variant` values:** `secondary` (outlined grey) or omit for primary blue gradient

**Badge `variant` values:** `default` (blue-tinted), `secondary` (violet-tinted), `destructive` (red-tinted), `outline` (transparent ring)

### SourceList Source Object Fields

All fields are optional in the component but should be populated by the backend when available:

| Field | Type | Description |
|---|---|---|
| `id` | string | Chunk UUID from the database |
| `title` | string | Document filename or display title |
| `excerpt` | string | Content snippet (~400 chars) |
| `score` | number | Cosine similarity (0–1) |
| `document` | string | Source filename (e.g. `api-guide.pdf`) |
| `section` | string | Document section or heading |
| `date` | string | Upload date `YYYY-MM-DD` |
| `category` | string | User-defined category |
| `url` | string | Link to the source document (optional) |

---

## 6. Error Handling

### Backend Errors

If backend errors **before Message 2 is sent:**
- Close stream with HTTP error code (500, 400, etc.)
- FE will show: "Something went wrong. Retry?"

### Backend Errors (Inside Response)
For errors during RAG/LLM generation — send Message 1 normally, then send Message 2 with an error `Text` component:
```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "qa-result",
    "components": [
      { "id": "answer-label", "component": "Text", "text": "Error", "usageHint": "h2" },
      { "id": "answer-body", "component": "Text", "text": "LLM rate limit exceeded", "usageHint": "body" }
    ]
  }
}
```
- FE renders the error text as a normal surface

### Frontend Error Responses

FE communicates errors back via console + display (no return channel):
- Network error: "Connection failed"
- Timeout (30s): "Query took too long"
- Invalid JSON: console error + display "Render failed"
- Unknown component: console warning + partial render

---

## 7. Testing This Contract

### Curl Test Template

```bash
# Test the 2-message flow against the FastAPI backend directly
curl -sN -X POST \
  "http://localhost:8000/api/agents/knowledge-qa?query=What+is+RAG"

# Expected output (2 lines, each valid JSON):
# {"version":"v0.9","createSurface":{"surfaceId":"qa-result","catalogId":"stub"}}
# {"version":"v0.9","updateComponents":{"surfaceId":"qa-result","components":[...]}}

# Or through the Next.js proxy (requires BACKEND_URL set in frontend/.env.local):
curl -sN -X POST \
  "http://localhost:3000/api/agents/knowledge-qa?query=What+is+RAG"
```

### Frontend Test

```typescript
// In FE console while query runs
const processor = window.__messageProcessor; // (if exposed for debugging)
processor.model.surfaces.forEach(s => {
  console.log('Surface:', s.surfaceId);
  console.log('Components:', s.componentsModel.ids);
  console.log('Data:', s.dataModel);
});
```

---

## 8. Version & Compatibility

- **Protocol Version:** A2UI v0.9
- **Transport:** HTTP/1.1 POST, newline-delimited JSON stream (`text/plain; charset=utf-8`)
- **JSON Version:** RFC 7159
- **Backcompat:** If adding new component types, add as optional. FE will warn if unknown.
- **Breaking Change:** If removing a required field, bump version number and notify FE team.

---

## 9. Implementation Checklist

Backend team must verify:
- [ ] 2 messages sent in correct order (`createSurface` → `updateComponents`)
- [ ] Each message has `version: "v0.9"`
- [ ] `surfaceId` matches across both messages
- [ ] `createSurface` has NO `components` field — just `surfaceId` and `catalogId`
- [ ] `updateComponents` uses `components[]` (full component array), not `updates[].patch`
- [ ] Component prop names match exactly: `label` (Button/Badge), `childIds` (Card), `sources` (SourceList), `text` (Text)
- [ ] Component IDs are unique within surface
- [ ] SourceList sources include all relevant fields (`id`, `title`, `excerpt`, `score`, `document`, `section`, `date`, `category`)
- [ ] Total time < 30s
- [ ] Error cases handled: HTTP 500 before stream, or error `Text` component in Message 2
- [ ] Tested with provided curl template
- [ ] Stream closes cleanly after Message 2

---

## 11. Ingestion Contract (Knowledge-QA) — Phase 2

### Purpose

**What:** Backend accepts document files for ingestion into the Knowledge-QA vector store  
**When:** Phase 2 (v2.0) — allows data to be loaded before queries can retrieve it  
**Who:** Admin users only (via authentication guard)

### Request Specification

**Frontend sends:**
```
POST /api/agents/ingest
Content-Type: multipart/form-data
Authorization: Bearer <admin-token>

Form Data:
- file: <single file> (PDF, DOCX, TXT, MD, etc.)
- metadata: { "category": "knowledge-base", "tags": ["api", "docs"] } (optional)
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/agents/ingest" \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@api-guide.pdf" \
  -F "metadata={\"category\":\"docs\",\"tags\":[\"api\"]}"
```

**Notes:**
- Single file per request (not multi-file)
- File field name is singular: `file`
- Bearer token required in Authorization header

### Response Specification (SSE Stream)

Backend MUST stream newline-delimited JSON (JSONL), one message per line:

**Message Format:**
```json
{
  "step": "<step-name>",
  "status": "<status>",
  "message": "<human-readable text>"
}
```

**Progress Stages (in order):**
1. `upload` — File received and validated
2. `parsing` — Extract text from file format (PDF, DOCX, TXT, MD)
3. `chunking` — Split text into semantic chunks (~500 tokens each)
4. `embedding` — Generate vector embeddings for each chunk
5. `storing` — Persist vectors + metadata to vector database

**Status Values:**
- `idle` — Stage not started yet
- `in_progress` — Stage is currently running
- `done` — Stage completed successfully
- `error` — Stage encountered an error

**Example Stream:**
```json
{"step": "upload", "status": "done", "message": "api-guide.pdf received (2.3 MB)"}
{"step": "parsing", "status": "in_progress", "message": "Extracting text..."}
{"step": "parsing", "status": "done", "message": "Extracted 15,432 bytes of text"}
{"step": "chunking", "status": "in_progress", "message": "Splitting into chunks..."}
{"step": "chunking", "status": "done", "message": "Created 28 chunks"}
{"step": "embedding", "status": "in_progress", "message": "Generating embeddings..."}
{"step": "embedding", "status": "done", "message": "Generated 28 embeddings"}
{"step": "storing", "status": "in_progress", "message": "Storing in vector database..."}
{"step": "storing", "status": "done", "message": "Successfully stored 28 chunks"}
```

**Frontend Progress Calculation:**
Each completed step contributes to overall progress:
- `upload`: 10%
- `parsing`: 20%
- `chunking`: 20%
- `embedding`: 35%
- `storing`: 15%

### Data Model (Document Schema)

See § 12 below.

### Timing & Stream Management

| Phase | Timing | What Happens |
|---|---|---|
| **Request arrives** | T+0ms | FE uploads file, stream opens |
| **Messages stream** | T+0ms - T+N*seconds | Backend sends progress updates (one per stage or sub-stage) |
| **Stream closes** | T+N*seconds | Connection closes after all stages done |

**Frontend timeout:** If last message not received by T+5min, show error: "Ingestion took too long"

**Error Handling:**
- If stage fails (status: "error"), continue streaming remaining stages
- FE displays error message in that step's UI
- User can retry after resolving issue (e.g., unsupported file type)

---

## 12. Data Model Schema (Knowledge-QA)

### Document Metadata Structure

**Every ingested chunk is stored with this schema:**

```typescript
interface DocumentChunk {
  id: string;                    // UUID v4, unique chunk identifier
  batchId?: string;              // Ingestion batch this chunk came from
  sourceFile: string;            // Original filename (e.g., "api-guide.pdf")
  uploadDate: ISO8601String;     // When file was uploaded
  category: string;              // User-defined: "technical", "faq", "tutorial", etc.
  tags: string[];                // Searchable tags: ["api", "docs", "v2"]
  
  chunkIndex: number;            // Sequence within file (0, 1, 2, ...)
  content: string;               // Actual text (truncated to ~500 tokens)
  embedding: number[];           // Vector representation (1536-dim for OpenAI)
  
  metadata: {
    startPage?: number;          // For PDFs: which page chunk started on
    endPage?: number;            // For PDFs: which page chunk ended on
    section?: string;            // Document section/heading
    customFields?: Record<string, any>;  // Any extra user-provided metadata
  }
}
```

### Database Schema (Supabase pgvector)

```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES ingestion_batches(id),
  source_file TEXT NOT NULL,
  upload_date TIMESTAMP DEFAULT NOW(),
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  chunk_index INTEGER,
  content TEXT NOT NULL,
  embedding vector(1536),  -- For OpenAI embeddings
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops);
```

### Usage in Queries

When Knowledge-QA query arrives, backend:
1. Converts query to embedding
2. Searches `document_chunks` table: `embedding <-> query_embedding` (cosine similarity)
3. Returns top-K chunks (e.g., 5 most relevant)
4. Constructs A2UI surface with chunks as sources
5. Each source card displays: title (sourceFile), excerpt (content truncated), score (similarity 0-1), link (URL)

### Ingestion Pipeline Process (Backend Responsibility)

**Phase 1: Parsing**
- Input: Raw file (PDF, DOCX, markdown, TXT)
- Process: Use appropriate parser (PyPDF2, python-docx, markdown-parser, etc.)
- Output: Extracted plain text string

**Phase 2: Chunking**
- Input: Full text from Phase 1
- Process: Recursive character splitting
  - Target: ~500 tokens per chunk (use tiktoken to measure)
  - Overlap: ~100 tokens between chunks (for context continuity)
  - Boundaries: Prefer splitting on sentences/paragraphs, not mid-word
- Output: Array of chunks (string[])

**Phase 3: Embedding**
- Input: Each chunk (string)
- Process: Send to embedding model (OpenAI, Cohere, local)
- Output: Dense vector (number[] of length 1536 for OpenAI)

**Phase 4: Storage**
- Input: Chunk + embedding + metadata
- Process: Insert into `document_chunks` table
- Output: Record persisted with UUID

---

## 10. Future Extensions (v2+)

These are NOT implemented in v1 but planned:

- [ ] Pagination: `cursor` param for loading more results
- [ ] Mutations: ButtonComponent sends clicks back to backend
- [ ] Real-time: multiple responses per query (Message 1-3 repeated)
- [ ] Forms: FormComponent type for data collection
- [ ] Tables: TableComponent type for data display
- [ ] Custom components: Third-party components via plugin system

---

**Questions?**
- FE developer: See [FE_Patterns.md](FE_Patterns.md) "Connect to Backend"
- BE developer: See this contract + [A2UI_Specification.md](A2UI_Specification.md)
- Architect: See [Architecture.md](Architecture.md)
