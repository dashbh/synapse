# Knowledge-QA — "The Library"

**Intent:** High-fidelity retrieval and reasoning from structured documentation.  
**Status:** MVP Complete  
**Endpoints:** `POST /api/agents/knowledge-qa` · `POST /api/agents/ingest`

---

## Features

| Feature | Description | Status |
|---------|-------------|--------|
| RAG pipeline | Embed query → pgvector search → gpt-4o-mini answer streamed via SSE | ✅ |
| Session persistence | Create, name, delete sessions; 10-message context window; hydration on reload | ✅ |
| Session sidebar | List / rename / delete / switch sessions in Document Drawer (Sessions tab) | ✅ |
| Architect's Triad | Every answer structured as Blueprint → Systemic Ripple → Boundary Condition via `SYSTEM_PROMPT` | ✅ |
| Rich citations | Inline `[N]` badges in Markdown → Drawer Sources tab; ConfidenceBadge per source | ✅ |
| Document ingestion | PDF, DOCX, MD, TXT; real-time SSE progress (Upload → Parse → Chunk → Embed → Store) | ✅ |
| Hybrid Search | GIN FTS + `hybrid_search_chunks` RPC + Python RRF merge | 🔲 Backlog |

---

## UX

**Query flow:** Textarea (`⌘↵` submit) → ThinkingIndicator (conic spinner + sequenced process log) → TurnView per query (latest on top, each with independent `surfaceId`)

**Document Drawer (left sidebar, collapsible):**
- `Documents` tab — drag-and-drop upload + 5-step ingestion stepper
- `Sources` tab — source cards with ConfidenceBadge (Strong / Good / Relevant / Partial)
- `Sessions` tab — SessionSwitcher: list, rename (double-click), delete, switch

**Command Palette (`⌘K`):** Upload, View Sources, New Query

**Drag-and-Drop:** Full-viewport overlay → auto-opens Drawer (Documents tab) + starts ingestion

---

## Success Criteria

- RAG query returns relevant results in < 2s
- Citations correctly link to source material
- Sessions persist across reload with full conversation hydration
- Ingestion shows real-time step progress with error recovery
- Ingestion endpoint accessible to authenticated admins only

---

## API

| Endpoint | Description | Contract |
|----------|-------------|----------|
| `POST /api/agents/knowledge-qa` | RAG query → SSE stream (`createSurface` + `updateComponents`) | [Contracts.md §1–9](../Contracts.md) |
| `POST /api/agents/ingest` | Multipart file upload → SSE progress stream | [Contracts.md §10](../Contracts.md) |

---

## Data Model

```sql
sessions        (id UUID, name TEXT, created_at, updated_at)
messages        (id UUID, session_id UUID, role TEXT, content TEXT, a2ui_payload JSONB, created_at)
document_chunks (id UUID, content TEXT, embedding vector(1536), metadata JSONB, source_file TEXT)
```

Full schema: [Contracts.md §11](../Contracts.md).

---

## Session Behavior

- Cookie `kqa_session_id` (30-day) drives session selection
- `GET /api/sessions/current` on mount; auto-creates if none exists
- `POST /api/sessions/{id}/activate` on session switch
- Hydration: replays stored `a2ui_payload` messages through MessageProcessor on session load
- LLM context: last 10 messages prepended to prompt (sliding window)
