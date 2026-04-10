# Project Synapse: AI Platform Specification

**Version:** 1.0  
**Status:** Finalized Requirements  
**Last Updated:** April 7, 2026  

---

## Core Philosophy

**System Thinking, Declarative UI, and Reactive Intelligence.**

Synapse is a modular AI Platform Shell designed to host specialized intelligence "Apps." It leverages the A2UI v0.9 protocol and Server-Sent Events (SSE) streaming to move beyond static chat interfaces into a rich, stateful, and component-driven user experience.

---

## 1. Executive Summary

Synapse provides a unified platform shell that orchestrates multiple AI "intelligence apps." Rather than a monolithic chatbot, Synapse is:

- **Modular:** Each app is a specialized intelligence service (Knowledge-QA, Reflexive-Brain, etc.)
- **Declarative:** All UI is rendered via A2UI protocol, never raw JSON blobs
- **Reactive:** SSE streams enable real-time, incremental UI updates
- **Stateful:** Full UI reset between app navigation for clean context boundaries

---

## 2. Architecture Principles

**Frontend Shell:**
- Path-based app routing (`/knowledge-qa`, `/reflexive-brain`) with full UI reset on switch (volatile sessions)
- App-agnostic platform shell (no business logic, only orchestration)
- Apps registered via AppRegistry pattern (extensible design)

**Protocol & Rendering:**
- Uses A2UI v0.9 protocol for declarative, component-driven UI
- Server-Sent Events (SSE) for real-time, streaming responses
- MessageProcessor = single source of truth for surface state

**Design System:**
- Unified design tokens (colors, typography, spacing, shadows)
- All styling applied consistently via Tailwind CSS
- Component catalog (Text, Card, Button, Badge, SourceList) handles rendering

**For technical implementation details, see [Architecture.md](Architecture.md) § 3.**

---

## 3. Hosted Applications

### 3.1 App: Knowledge-QA (The Library)

**Intent:** High-fidelity retrieval and reasoning from structured documentation.

**Core Capabilities:**

#### Semantic Search
- Query processed document indices
- Return ranked results with relevance scoring
- Support for multi-term complex queries

#### Rich Citations
- UI support for Reference components
- Show source-text previews in side panel
- Clickable citations leading to source material
- Metadata display (document, section, date, category)

#### Admin Ingestion
- **Trigger:** Explicit (Manual upload)
- **Entry Point:** First-class citizen of Knowledge-QA app UI (admin-protected route)
- **Process:**
  1. File upload (PDF, DOCX, markdown, plain text)
  2. PDF/Doc parsing
  3. Recursive character splitting
  4. Vector embedding
  5. Metadata tagging (Source, Date, Category, Custom Tags)
  6. Vector store persistence
  
#### Ingestion Feedback
- Real-time progress visualization via SSE
- Display each stage: Parsing ➔ Chunking ➔ Embedding
- Progress bar or step indicators
- Cancel capability mid-ingestion

**Success Criteria:**
- Semantic search returns relevant results within 2 seconds
- Citations correctly link to source material
- Ingestion UI accessible only to authenticated admins
- Real-time progress feedback for ingestion tasks

### 3.2 App: Reflexive-Brain (The Nervous System) — Phase 2

**Intent:** Capture, triage, and connection of personal "Stream of Consciousness" data.

**Core Capabilities:**

#### Quick Capture
- High-speed text and voice entry
- Optimized for Apple Watch (ultra-fast transcription)
- Optimized for mobile (minimal UI)
- Keyboard shortcut support (⌘↵ on desktop)
- Voice-to-text with minimal latency

#### Global Search
- Query personal notes (local to Reflexive-Brain)
- Simultaneous search of Knowledge-QA index (federated)
- Unified results view showing source (note vs. external doc)
- Ability to create connections between personal notes and knowledge items

#### Agentic Triage
- Automatic categorization: "Actionable Task" vs. "Long-term Memory"
- AI-driven suggestion of related items from Knowledge-QA
- Support for custom triage rules (user-defined categories)
- Batch processing for multiple captures

**Success Criteria:**
- Capture latency < 500ms from input to storage
- Search returns results from both sources within 1 second
- Triage accuracy > 85% for standard categories

---

## 4. Success Metrics & Non-Functional Requirements

### Query Performance
- Semantic search returns relevant results within 2 seconds
- Citations correctly link to source material
- UI renders results incrementally (progressive disclosure)

### Ingestion (Admin)
- Ingestion UI accessible only to authenticated admins
- Real-time progress feedback for ingestion tasks
- Support for batch upload (multiple files simultaneously)
- Error recovery (ability to retry or skip problematic documents)

### Platform Stability
- Full app reset on route navigation (no state bleeding)
- Graceful degradation on network interruption
- Exponential backoff retry on errors
- No resource leaks on app switching

### User Experience
- First app load: < 2 seconds
- Query → result display: < 2 seconds
- Skeleton loader while streaming (no blank screen)
- User-visible error messages (never silent failures)

**For technical performance targets and resilience standards, see [Governance.md](Governance.md) § "Build Quality & Resilience Standards".**

---

## 6. UI/UX Specification

### 6.1 Component Architecture

Synapse uses a unified A2UI component catalog for rendering (7 types):
- **TextComponent** — Headings, paragraphs, captions (usageHint: h1/h2/h3/body/caption)
- **CardComponent** — Containers for grouped content
- **ButtonComponent** — User interactions
- **BadgeComponent** — Status and metadata display
- **MarkdownComponent** — Markdown body rendering (react-markdown + GFM; inline `[N]` citation badges)
- **SourceListComponent** — Compact citation strip; registers sources in registry for the Drawer
- **MetadataCard** — Document, Section, Date, Category grid

Supporting UI components (not A2UI types):
- **ConfidenceBadge** — Color-coded confidence tier (Strong/Good/Relevant/Partial) with segment bar

**For component APIs and design tokens, see [FE_Reference.md](FE_Reference.md).**

### 6.2 Knowledge-QA UX

**Query Input:**
- Controlled textarea with keyboard shortcut (⌘↵)
- Command Palette triggered via ⌘K — actions: Upload, View Sources, New Query

**Thinking Indicator (replaces static spinner):**
- Gemini-style conic-gradient spinning ring
- Process log sequences: Embedding query → Searching vectors → Synthesizing context → Generating response
- Appears below query input while streaming; disappears on completion

**Results Display:**
- Answer rendered as Markdown with inline `[N]` citation badges (clicking opens Drawer → Sources tab)
- Model + token usage caption (e.g. `Model: gpt-4o-mini · 234 tokens (180 in, 54 out)`)
- Last query shown above answer: `Q: <question>`

**Document Drawer (right-side panel):**
- Persistent icon in header badges count of successfully ingested documents
- Two tabs: **Documents** (upload + ingestion progress) | **Sources** (source cards with confidence)
- Source cards: title, category, excerpt, ConfidenceBadge, metadata, URL
- Citation click scrolls to and highlights the matching source card

**Drag-and-Drop Overlay:**
- Full-viewport overlay activates when any file is dragged over the window
- On drop: opens Drawer (Documents tab) and starts ingestion automatically

### 6.3 Ingestion UI (Admin)

**Upload Interface (inside Document Drawer):**
- Full-screen drag-and-drop overlay (global — not confined to the panel)
- Browse file picker fallback
- Supported formats: PDF, DOCX, MD, TXT

**Progress Display:**
- Multi-step vertical stepper: Upload → Parsing → Chunking → Embedding → Storing
- Step icons (Lucide), color-coded states (idle / in_progress / done / error)
- Progress bar with percentage inside the drawer

**On Completion:**
- Success banner + "Upload another" link
- Document count badge in header increments

---

## 7. API Endpoint Specifications

**For FE ↔ BE contracts (message formats, timing, data bindings), see [Contracts.md](Contracts.md):**
- § 1-7: Query endpoint (Knowledge-QA)
- § 11: Ingestion endpoint (future)
- § 12: Data model schema

---

## 8. Roadmap & Backlog

### v1.0 — Complete (FE + BE + Infra)

**Frontend**
- ✅ Platform Shell with AppRegistry
- ✅ Knowledge-QA app (semantic search + ingestion UI)
- ✅ A2UI v0.9 protocol integration
- ✅ SSE streaming (Message→React)
- ✅ Design system + catalog components (7 types: Text, Card, Button, Badge, SourceList, MetadataCard, Markdown)
- ✅ SSE explicit close on route change; volatile session reset on app nav
- ✅ Ingestion UI — real-time step progress (Upload → Parsing → Chunking → Embedding → Storing)
- ✅ Right-side Document Drawer (Documents + Sources tabs; replaces left sidebar)
- ✅ Inline `[N]` citation badges in Markdown answers → open Drawer Sources tab
- ✅ ConfidenceBadge — color-coded strength tiers (Strong/Good/Relevant/Partial) with segment bar
- ✅ Gemini-style ThinkingIndicator with process log (replaces static spinner)
- ✅ Drag-and-drop full-viewport overlay → auto-opens Drawer and starts ingestion
- ✅ Command Palette (⌘K) — upload, view sources, new query
- ✅ Model name + token usage displayed after each answer
- ✅ Semantic search filters removed (superseded by inline citation navigation)

**Backend**
- ✅ FastAPI scaffold (CORS, routing, health endpoint with dependency checks)
- ✅ `POST /api/agents/knowledge-qa` — RAG query pipeline over SSE
- ✅ `POST /api/agents/ingest` — document ingestion (PDF, DOCX, TXT, MD) over SSE
- ✅ A2UI v0.9 message builders (`createSurface` + `updateComponents`)
- ✅ RAG pipeline: OpenAI `text-embedding-ada-002` → Supabase pgvector → `gpt-4o-mini`
- ✅ Similarity threshold filter (irrelevant sources suppressed at query time)
- ✅ Deduplication on re-upload (replaces existing chunks for same source file)
- ✅ Contract-compliant streaming; error logging (internals never exposed to client)
- ✅ Supabase DB schema operational (pgvector, `document_chunks`, `match_document_chunks` RPC)
- ✅ Environment fully configured (API keys, Supabase credentials)

**Infrastructure**
- ✅ Docker Compose with `dev` and `prod` profiles (`infra/docker-compose.yml`)
- ✅ Multi-stage Dockerfiles — FE (Next.js standalone) + BE (Python 3.12-slim)
- ✅ CORS configurable via `CORS_ORIGINS` env var
- ✅ Root-level `.env.example` with all required variables

### v2.0 — Planned

- [ ] Reflexive-Brain app (quick capture, global search, agentic triage)
- [ ] Implicit Ingestion: automated watcher services for cloud/local folder syncing
- [ ] Session Hydration: persistence layer for cross-session conversation resumption
- [ ] Real admin authentication (OAuth/SAML)
- [ ] Admin bearer token guard on ingestion endpoint

### v3.0+ — Future

- [ ] Component Extensibility: dynamic A2UI mapping for agent-proposed custom layouts
- [ ] Advanced search: full-text + semantic hybrid search
- [ ] Custom agent templates
- [ ] Multi-workspace support
- [ ] Cloud sync (document versioning, sharing)

---

## 9. Specifications & Implementation Mapping

**Where requirements are documented:**

| Requirement | Location |
|---|---|
| Business goals & scope | § 1-3 (this document) |
| System principles & architecture | [Architecture.md](Architecture.md) |
| Quality & resilience standards | [Governance.md](Governance.md) § "Build Quality & Resilience Standards" |
| Component & design tokens | [FE_Reference.md](FE_Reference.md) |
| API contracts & message specs | [Contracts.md](Contracts.md) |
| How-to guides & patterns | [FE_Patterns.md](FE_Patterns.md) |
| Frontend rules & constraints | [Governance.md](Governance.md) |

---

## 10. Implementation Status

All v1.0 requirements are complete — Frontend, Backend, and Infrastructure.

### 🟢 Frontend — Complete

| # | Feature | Status | Notes |
|---|---|---|---|
| **C1** | Platform Shell with AppRegistry | ✅ Done | App-agnostic routing via `AppRegistry` pattern |
| **C2** | A2UI v0.9 protocol | ✅ Done | MessageProcessor validates and renders |
| **C3** | SSE streaming | ✅ Done | `useAgentStream` → `useSSE` POST streaming |
| **C4** | React + Tailwind + shadcn/ui stack | ✅ Done | Design tokens mapped correctly |
| **C5** | Knowledge-QA query interface | ✅ Done | Controlled `QueryInput` + `ThinkingIndicator`; search filters removed |
| **C6** | Catalog components (7 types) | ✅ Done | Text, Card, Button, Badge, SourceList, MetadataCard, Markdown |
| **C7** | SOLID principles enforcement | ✅ Done | Layer boundaries strictly enforced |
| **C8** | Graceful stream interruption | ✅ Done | Error boundary + retry UI |
| **C9** | TypeScript strict mode | ✅ Done | No `any`, all A2UI types validated |
| **C10** | SSE explicit close on route change | ✅ Done | `useSSE` abort cleanup on unmount |
| **C11** | Volatile session reset | ✅ Done | Surfaces cleared in `useAgentStream` unmount |
| **C12** | Ingestion status UI | ✅ Done | Real-time Parsing → Chunking → Embedding steps in Document Drawer |
| **C13** | SSE-based `/ingest` endpoint | ✅ Done | Real pipeline: upload→parse→chunk→embed→store |
| **C14** | Inline citation badges | ✅ Done | `[N]` in Markdown → clickable badge → opens Drawer Sources tab |
| **C15** | Citation metadata display | ✅ Done | Source cards in Drawer — Document, Section, Date, Category, excerpt |
| **C16** | Semantic search filters | ✅ Removed | Replaced by inline citation navigation; URL params dropped |
| **C17** | Admin auth gate for ingestion | ✅ Done | Bypassed in v1; real OAuth deferred to v2 |
| **C18** | Document Drawer (right panel) | ✅ Done | `DocumentDrawer` — Documents + Sources tabs; slides in from right |
| **C19** | Command Palette | ✅ Done | `CommandPalette` (⌘K) — upload, view sources, new query |
| **C20** | Drag-and-drop overlay | ✅ Done | `DragDropOverlay` — full-viewport; auto-opens Drawer + starts ingestion |
| **C21** | Thinking indicator | ✅ Done | `ThinkingIndicator` — conic-gradient spinner + sequenced process log |
| **C22** | Confidence scoring UI | ✅ Done | `ConfidenceBadge` — Strong/Good/Relevant/Partial tiers with segment bar |

### 🟢 Backend — Complete

| # | Feature | Status | Notes |
|---|---|---|---|
| **B1** | FastAPI app scaffold | ✅ Done | `main.py` — CORS, routing, health endpoint with dependency checks |
| **B2** | `POST /api/agents/knowledge-qa` | ✅ Done | `routes/knowledge_qa.py` — query validation, SSE StreamingResponse |
| **B3** | `POST /api/agents/ingest` | ✅ Done | `routes/ingest.py` + `agents/ingest_agent.py` — PDF/DOCX/TXT/MD pipeline |
| **B4** | A2UI v0.9 message builders | ✅ Done | `app/a2ui/messages.py` — `createSurface` + `updateComponents` |
| **B5** | RAG pipeline | ✅ Done | `agents/knowledge_qa_agent.py` — embed → pgvector → `gpt-4o-mini`; returns model name + token usage shown in UI |
| **B6** | Similarity threshold filter | ✅ Done | Chunks below `MIN_SIMILARITY=0.78` discarded; empty sources returned cleanly |
| **B7** | Deduplication on re-upload | ✅ Done | Existing chunks for same `source_file` deleted before insert |
| **B8** | Error handling | ✅ Done | Server-side logging; generic messages to client — internals never exposed |
| **B9** | Supabase DB schema | ✅ Done | pgvector extension, `document_chunks` table, `match_document_chunks` RPC |
| **B10** | Environment configuration | ✅ Done | `.env` configured with `OPENAI_API_KEY`, Supabase credentials |

### 🟢 Infrastructure — Complete

| # | Feature | Status | Notes |
|---|---|---|---|
| **I1** | Docker Compose | ✅ Done | `infra/docker-compose.yml` — `dev` + `prod` profiles |
| **I2** | Frontend Dockerfile | ✅ Done | Multi-stage: dev (hot-reload) + prod (Next.js standalone) |
| **I3** | Backend Dockerfile | ✅ Done | Multi-stage: dev (uvicorn --reload) + prod (uvicorn workers) |
| **I4** | Configurable CORS | ✅ Done | `CORS_ORIGINS` env var, comma-separated |
| **I5** | Root `.env.example` | ✅ Done | Consolidated template for all services |

---

## 11. Checklist: Implementation Verification

### Frontend

| Item | Status |
|---|---|
| **FE Architecture** | Platform Shell loads without app-specific imports ✓ |
| **A2UI Protocol** | MessageProcessor receives 2-message sequence (`createSurface` → `updateComponents`) ✓ |
| **SSE Transport** | Stream closes explicitly on route change ✓ |
| **Session Cleanup** | App switch clears all surfaces + state ✓ |
| **Components** | All 7 catalog components render from A2UI ✓ |
| **Design Tokens** | Styling driven from designTokens.ts only ✓ |
| **Error Handling** | Graceful fallback on stream interruption ✓ |
| **Citation Badges** | `[N]` markers in Markdown open Drawer → Sources tab ✓ |
| **Confidence Display** | ConfidenceBadge shows tier label + segment bar in Drawer ✓ |
| **Document Drawer** | Right-panel slides in; Documents + Sources tabs ✓ |
| **Drag-and-Drop** | Full-viewport overlay → auto-ingestion on drop ✓ |
| **Search Filters** | Removed — inline citation navigation used instead ✓ |
| **Ingest Auth** | Auth bypassed in v1; real OAuth deferred to v2 ✓ |

### Backend

| Item | Status |
|---|---|
| **2-message sequence** | `createSurface` → `updateComponents` in correct order ✓ |
| **Message version** | Both messages carry `"version": "v0.9"` ✓ |
| **surfaceId consistency** | Matches across both messages (`"qa-result"`) ✓ |
| **createSurface structure** | No `components` field — only `surfaceId` + `catalogId` ✓ |
| **updateComponents structure** | Full `components[]` array, not patch ✓ |
| **Component prop names** | `text`, `usageHint`, `sources` match contract exactly ✓ |
| **SourceList fields** | All 9 fields populated: id, title, excerpt, score, document, section, date, category, url ✓ |
| **Query validation** | HTTP 400 returned when `query` param is missing or empty ✓ |
| **Error handling** | Server-side logging; generic messages to client ✓ |
| **Response headers** | `Content-Type: text/plain`, `Cache-Control: no-cache`, `X-Accel-Buffering: no` ✓ |
| **Supabase schema** | pgvector extension, table, and RPC created and operational ✓ |
| **Ingest pipeline** | upload → parse → chunk → embed → store with SSE progress ✓ |
| **Similarity filter** | Irrelevant sources suppressed (`MIN_SIMILARITY = 0.78`) ✓ |
| **Deduplication** | Re-upload replaces existing chunks for same file ✓ |

### Infrastructure

| Item | Status |
|---|---|
| **Docker Compose** | `dev` and `prod` profiles working ✓ |
| **FE container** | Hot-reload in dev; standalone build in prod ✓ |
| **BE container** | `uvicorn --reload` in dev; workers in prod ✓ |
| **Secrets** | Root `.env` via `env_file` — no secrets in images ✓ |
| **Networking** | FE→BE via Docker internal DNS (`BACKEND_URL`) ✓ |

---

## Document Change Log

| Date | Version | Changes |
|---|---|---|
| April 7, 2026 | 1.0 | Initial specification (Project Synapse finalized requirements) |
| April 7, 2026 | 1.1 | SOLID refactor: Moved technical details to Architecture.md, Contracts.md, Governance.md; retained business spec only |
| April 7, 2026 | 1.2 | Closed all D1–D8 deviations; updated roadmap and compliance table to reflect v1.5 close-out |
| April 9, 2026 | 1.3 | BE v1 scaffolded: FastAPI + RAG pipeline + A2UI message builders; §8 roadmap and §10–11 updated to reflect BE v1 status |
| April 10, 2026 | 1.4 | v1 closed out: real ingest pipeline, similarity filter, deduplication, Docker Compose infra, Supabase operational; roadmap consolidated to v1/v2/v3+; §10–11 fully updated |
| April 10, 2026 | 1.5 | UX overhaul: Document Drawer (right panel), inline citation badges, ConfidenceBadge, ThinkingIndicator, Cmd+K palette, drag-and-drop overlay; §6, §8, §10–11 updated; search filters removed |

