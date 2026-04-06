# Frontend ↔ Backend Contract Specification

**Version:** 1.0  
**Protocol:** A2UI v0.9 over SSE  
**Last Updated:** April 7, 2026  
**Status:** Locked (FE ready, waiting for BE implementation)

---

## 1. Request Specification

**Frontend sends:**

```
POST /api/agents/knowledge-qa
Content-Type: application/x-www-form-urlencoded

query=<user-question-string>
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/agents/knowledge-qa" \
  -d "query=What%20is%20machine%20learning?"
```

**Response Headers (what FE expects):**
```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Transfer-Encoding: chunked
```

---

## 2. Response Specification (Exact Message Sequence)

Backend MUST send exactly 3 newline-delimited JSON messages in this order:

### Message 1: surfaceUpdate (Component Definitions)

```json
{
  "surfaceUpdate": {
    "surfaceId": "qa-result",
    "components": [
      {
        "id": "answer-label",
        "component": {
          "Text": {
            "text": { "literalString": "Answer" },
            "usageHint": "h2"
          }
        }
      },
      {
        "id": "answer-body",
        "component": {
          "Text": {
            "text": { "path": "/answer/text" }
          }
        }
      },
      {
        "id": "sources-label",
        "component": {
          "Text": {
            "text": { "literalString": "Sources" },
            "usageHint": "h3"
          }
        }
      },
      {
        "id": "sources-list",
        "component": {
          "SourceList": {
            "items": { "path": "/sources" }
          }
        }
      }
    ]
  }
}
```

**Constraints:**
- Must have `surfaceId` (unique identifier)
- `components` array with at least one component
- Each component has `id` (unique within surface) and `component` (type + props)
- Props use data binding syntax: `{ "path": "/key" }` for dynamic, `{ "literalString": "..." }` for static

### Message 2: dataModelUpdate (Data Binding)

Sent ~300ms after Message 1.

```json
{
  "dataModelUpdate": {
    "surfaceId": "qa-result",
    "contents": [
      {
        "key": "answer",
        "valueMap": [
          { "key": "text", "valueString": "Machine learning is a subset of AI where systems learn from data without explicit programming. It powers recommendations, image recognition, and natural language processing." }
        ]
      },
      {
        "key": "sources",
        "valueList": [
          {
            "valueMap": [
              { "key": "title", "valueString": "Introduction to Machine Learning" },
              { "key": "excerpt", "valueString": "ML is a branch of artificial intelligence focused on enabling computers to learn from experience..." },
              { "key": "score", "valueFloat": 0.92 },
              { "key": "url", "valueString": "https://docs.example.com/ml-intro" }
            ]
          },
          {
            "valueMap": [
              { "key": "title", "valueString": "Deep Learning Fundamentals" },
              { "key": "excerpt", "valueString": "Deep learning uses neural networks with multiple layers to process complex data..." },
              { "key": "score", "valueFloat": 0.87 },
              { "key": "url", "valueString": "https://docs.example.com/deep-learning" }
            ]
          }
        ]
      }
    ]
  }
}
```

**Constraints:**
- `surfaceId` must match Message 1
- `contents` array with key-value pairs
- Values can be: `valueString`, `valueFloat`, `valueList`, `valueMap`
- List items match the structure components expect (SourceList expects map with title/excerpt/score/url)

### Message 3: beginRendering (Render Signal)

Sent ~300ms after Message 2.

```json
{
  "beginRendering": {
    "surfaceId": "qa-result",
    "root": "answer-label"
  }
}
```

**Constraints:**
- `surfaceId` must match Messages 1 & 2
- `root` is component ID to start rendering from
- After this message, close the SSE stream

---

## 3. Timing & Stream Management

| Phase | Timing | What Happens |
|---|---|---|
| **Connection opens** | T+0ms | FE opens SSE stream to endpoint |
| **Message 1 sent** | T+0-100ms | Backend sends surfaceUpdate |
| **Message 2 sent** | T+300ms ±100ms | Backend sends dataModelUpdate (simulates thinking) |
| **Message 3 sent** | T+600ms ±100ms | Backend sends beginRendering |
| **Stream closes** | T+700ms | connection closes, rendering starts |
| **Total duration** | 1-30s | Configurable based on RAG query time |

**Frontend timeout:** If `beginRendering` not received by T+30s, show error: "Query took too long"

---

## 4. Data Binding & Value Types

### Static Values
For fixed text, use `literalString`:
```json
{ "text": { "literalString": "Label" } }
```

### Dynamic Values
To bind to data model, use `path`:
```json
{ "text": { "path": "/answer/text" } }
```

Path syntax:
- `/answer/text` — access `contents[0].key="answer" → valueMap[0].key="text" → valueString`
- `/sources` — access array at that key
- `/sources[0]/title` — future support (not in v1)

### Supported Value Types
| Type | JSON Field | Example |
|---|---|---|
| String | `valueString` | `"valueString": "Hello"` |
| Float | `valueFloat` | `"valueFloat": 0.95` |
| List | `valueList` | `"valueList": [...]` |
| Map | `valueMap` | `"valueMap": [{"key": "k", "valueString": "v"}]` |

---

## 5. Supported Component Types

Frontend can render these A2UI component types:

| Type | Props | Example |
|---|---|---|
| **Text** | `text`, `usageHint` | `{ "Text": { "text": {...}, "usageHint": "h1" } }` |
| **Card** | `childs` (component IDs) | `{ "Card": { "childs": ["id1", "id2"] } }` |
| **Button** | `text`, `variant` | `{ "Button": { "text": {...}, "variant": "primary" } }` |
| **Badge** | `text`, `variant` | `{ "Badge": { "text": {...}, "variant": "success" } }` |
| **SourceList** | `items` | `{ "SourceList": { "items": { "path": "/sources" } } }` |

**Text `usageHint` values:**
- `h1` → large heading
- `h2` → medium heading
- `h3` → small heading
- `body` → normal paragraph text
- `caption` → small grey text

**Button/Badge `variant` values:**
- `primary` (default blue)
- `secondary` (outline)
- `success` (green)
- `warning` (orange)
- `error` (red)

---

## 6. Error Handling

### Backend Errors

If backend encounters error **before sending all 3 messages:**
- Close stream with HTTP error code (500, 400, etc.)
- Or send partial messages that FE can render with loading state
- FE will show: "Something went wrong. Retry?"

### Backend Errors (Inside Response)
For errors during message generation:
- Send messages 1 & 2 normally
- Add error field to Message 3:
```json
{
  "beginRendering": {
    "surfaceId": "qa-result",
    "error": "LLM rate limit exceeded"
  }
}
```
- FE will display error message instead of rendering

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
# Test the full 3-message flow
curl -X POST "http://localhost:3000/api/agents/knowledge-qa" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "query=test" \
  --no-buffer

# Expected output (3 lines, each valid JSON):
# {"surfaceUpdate": {...}}
# {"dataModelUpdate": {...}}
# {"beginRendering": {...}}
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
- **SSE Version:** HTTP/1.1 text/event-stream
- **JSON Version:** RFC 7159
- **Backcompat:** If adding new component types, add as optional. FE will warn if unknown.
- **Breaking Change:** If removing a required field, bump version number and notify FE team.

---

## 9. Implementation Checklist

Backend team must verify:
- [ ] All 3 messages sent in correct order (surfaceUpdate → dataModelUpdate → beginRendering)
- [ ] `surfaceId` matches across all messages
- [ ] Data model values match component data bindings (all `/path` references resolve)
- [ ] Component IDs are unique within surface
- [ ] No circular data binding (impossible but check anyway)
- [ ] Timing: Messages spaced ~300ms apart (OK to tune)
- [ ] Total time < 30s (or inform FE of custom timeout)
- [ ] Error cases handled (500 responses or error field in Message 3)
- [ ] Tested with provided curl template
- [ ] SSE stream closes cleanly after Message 3

---

## 11. Ingestion Contract (Knowledge-QA) — Phase 2

### Purpose

**What:** Backend accepts document files for ingestion into the Knowledge-QA vector store  
**When:** Phase 2 (v2.0) — allows data to be loaded before queries can retrieve it  
**Who:** Admin users only (via authentication guard)

### Request Specification

**Frontend sends:**
```
POST /api/agents/knowledge-qa/ingest
Content-Type: multipart/form-data

Form Data:
- files: [file1.pdf, file2.docx, ...] (multiple files allowed)
- metadata: { "category": "knowledge-base", "tags": ["api", "docs"] } (optional)
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/agents/knowledge-qa/ingest" \
  -H "Authorization: Bearer <admin-token>" \
  -F "files=@doc1.pdf" \
  -F "files=@doc2.docx" \
  -F "metadata={\"category\":\"docs\",\"tags\":[\"api\"]}"
```

### Response Specification (SSE Stream)

Backend MUST stream progress updates in real-time, one message per line:

**Message 1: ingestionStart**
```json
{
  "ingestionStart": {
    "batchId": "batch-12345",
    "totalFiles": 2,
    "totalSize": "5.2MB"
  }
}
```

**Messages 2-N: ingestionProgress** (repeating for each file + stage)
```json
{
  "ingestionProgress": {
    "batchId": "batch-12345",
    "file": "doc1.pdf",
    "stage": "parsing",
    "progress": 25,
    "message": "Extracting text from PDF..."
  }
}
```

**Progress Stages (in order):**
1. `parsing` — Extract text from file format (PDF parser, Word parser, etc.)
2. `chunking` — Split text into semantic chunks (~500 tokens each)
3. `embedding` — Generate vector embeddings for each chunk
4. `storage` — Persist vectors + metadata to vector store

Each stage shows 0-100% progress. Frontend displays multi-step progress bar.

**Final Message: ingestionComplete**
```json
{
  "ingestionComplete": {
    "batchId": "batch-12345",
    "success": true,
    "documentsIngested": 2,
    "chunksCreated": 45,
    "errors": []
  }
}
```

or if errors:

```json
{
  "ingestionComplete": {
    "batchId": "batch-12345",
    "success": false,
    "documentsIngested": 1,
    "chunksCreated": 22,
    "errors": [
      { "file": "doc2.docx", "reason": "Unsupported format", "severity": "error" }
    ]
  }
}
```

### Data Model (Document Schema)

See § 12 below.

### Timing & Stream Management

| Phase | Timing | What Happens |
|---|---|---|
| **Request arrives** | T+0ms | FE uploads files, stream opens |
| **Message 1 sent** | T+0-100ms | Backend sends ingestionStart |
| **Messages 2-N sent** | T+100ms - T+N*seconds | Backend streams progress per file + stage |
| **Final message sent** | T+N*seconds | Backend sends ingestionComplete |
| **Stream closes** | T+N*seconds+100ms | Connection closes after final message |

**Frontend timeout:** If ingestionComplete not received by T+5min (configurable), show error: "Ingestion took too long"

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
