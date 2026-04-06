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

Synapse uses a unified component catalog for rendering:
- **TextComponent** — Headings, paragraphs, captions
- **CardComponent** — Containers for grouped content
- **ButtonComponent** — User interactions
- **BadgeComponent** — Status and metadata display
- **SourceListComponent** — Citation references with relevance scores

**For component APIs and design tokens, see [FE_Reference.md](FE_Reference.md).**

### 6.2 Knowledge-QA UX

**Query Input:**
- Search box with keyboard shortcut (⌘↵)
- Placeholder text: "Ask about your knowledge base..."
- Character count limit (optional)

**Stream Status.**
- 4 states: IDLE, STREAMING, DONE, ERROR
- Visual progress (spinner on STREAMING)
- Success/error messaging

**Results Display:**
- Citeable content with reference links
- Side panel for source preview
- Related suggestions (if available)
- Refinement options (filter by category, date range)

**Loading States:**
- Skeleton loader during ingestion
- Progress bar for long operations
- Graceful error display with retry button

### 6.3 Ingestion UI (Admin)

**Upload Interface:**
- Drag-and-drop file upload
- Browse file picker
- Show supported formats (PDF, DOCX, markdown, TXT)
- Multiple file selection

**Progress Display:**
- Multi-step progress: Parsing → Chunking → Embedding → Complete
- Percentage/file count
- Time elapsed, estimated time remaining
- Cancel button

**Results Summary:**
- Total documents ingested
- Total chunks created
- Any errors or warnings
- Option to view ingestion log

---

## 7. API Endpoint Specifications

**For FE ↔ BE contracts (message formats, timing, data bindings), see [Contracts.md](Contracts.md):**
- § 1-7: Query endpoint (Knowledge-QA)
- § 11: Ingestion endpoint (future)
- § 12: Data model schema

---

## 8. Roadmap & Backlog

### Phase 1 (Current: v1.0 Complete)
- ✅ Platform Shell with AppRegistry
- ✅ Knowledge-QA app (semantic search + mock ingestion UI)
- ✅ A2UI v0.9 protocol integration
- ✅ SSE streaming (Message→React)
- ✅ Design system + catalog components

### Phase 2 (v2.0)
- [ ] Reflexive-Brain app implementation
- [ ] Implicit Ingestion: Automated "Watcher" services for cloud/local folder syncing
- [ ] Session Hydration: Persistence layer to resume conversations across refreshes
- [ ] Admin authentication (OAuth/SAML)
- [ ] Backend implementation (Python FastAPI + LangChain + Claude)

### Phase 3 (v3.0+)
- [ ] Component Extensibility: Dynamic A2UI mapping for agent-proposed custom layouts
- [ ] Advanced search: Full-text search + semantic hybrid search
- [ ] Custom agent templates: Let users create specialized apps
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

## 10. Deviation Flags: Requirements vs. Current Implementation

⚠️ **DEVIATIONS IDENTIFIED:**

### 🔴 Critical Gaps (Must Fix Before v1 Close-Out)

| # | Gap | Current State | Required | Action |
|---|---|---|---|---|
| **D1** | SSE explicit close on route change | ✅ Connection exists | Must explicitly `.close()` on app navigation | Verify `useAgentStream` cleanup in dependency tracking |
| **D2** | Volatile Session reset | Partial (MessageProcessor clears) | Full UI state reset on app nav (confirmed behavior) | Verify all Zustand state clears on route change |
| **D3** | Ingestion feedback UI (Progress steps) | ❌ Mock only | Real-time Parsing → Chunking → Embedding display | Create ingestion status component (Phase 2) |
| **D4** | Ingestion endpoint (/ingest) | ❌ Does not exist | SSE-based ingestion with progress | Backend implementation (Phase 2) |

### 🟡 Partial Implementation (v1.5 Deferred)

| # | Feature | Current State | Required | Action |
|---|---|---|---|---|
| **D5** | Rich Citations (side panel) | ❌ Basic reference list | Full citation UI with source preview | Extend SourceListComponent (Phase 2) |
| **D6** | Citation metadata display | ❌ Not implemented | Show (Document, Section, Date, Category) | Add MetadataCard component (Phase 2) |
| **D7** | Semantic search filters | ❌ Not implemented | Filter by category, date range in UI | Add filter panel to Knowledge-QA (Phase 2) |
| **D8** | Admin auth for ingestion | ❌ Not implemented | Auth guard on /ingest endpoint | Backend + Auth layer (Phase 2) |

### 🟢 Implemented & Compliant (v1.0)

| # | Feature | Status | Notes |
|---|---|---|---|
| **C1** | Platform Shell with AppRegistry | ✅ Done | App-agnostic routing via `AppRegistry` pattern |
| **C2** | A2UI v0.9 protocol | ✅ Done | MessageProcessor validates and renders |
| **C3** | SSE streaming | ✅ Done | `useAgentStream` → `useSSE` POST streaming |
| **C4** | React + Tailwind + shadcn/ui stack | ✅ Done | Design tokens mapped correctly |
| **C5** | Knowledge-QA query interface | ✅ Done | QueryInput + StreamStatusBar complete |
| **C6** | Catalog components (5 types) | ✅ Done | Text, Card, Button, Badge, SourceList |
| **C7** | SOLID principles enforcement | ✅ Done | Layer boundaries strictly enforced |
| **C8** | Graceful stream interruption | ✅ Done | Error boundary + retry UI |
| **C9** | TypeScript strict mode | ✅ Done | No `any`, all A2UI types validated |

---

## 11. Checklist: Implementation Verification

After implementing deviations, verify:

| Item | Verify |
|---|---|
| **FE Architecture** | Platform Shell loads without app-specific imports ✓ |
| **A2UI Protocol** | MessageProcessor receives 3-message sequence ✓ |
| **SSE Transport** | Stream closes explicitly on route change ✓ |
| **Session Cleanup** | App switch clears all surfaces + state ✓ |
| **Components** | All 5 catalog components render from A2UI ✓ |
| **Design Tokens** | Styling driven from designTokens.ts only ✓ |
| **Error Handling** | Graceful fallback on stream interruption ✓ |

---

## 12. Backward Compatibility & Deprecations

- No breaking changes at platform level (AppRegistry pattern stable)
- A2UI v0.9 locked (no v1.0 upgrade planned in v2)
- Catalog components extensible (new components can be added without breaking existing)
- SSE message format stable (new message types can be added without breaking streaming)

---

## Document Change Log

| Date | Version | Changes |
|---|---|---|
| April 7, 2026 | 1.0 | Initial specification (Project Synapse finalized requirements) |
| April 7, 2026 | 1.1 | SOLID refactor: Moved technical details to Architecture.md, Contracts.md, Governance.md; retained business spec only |

