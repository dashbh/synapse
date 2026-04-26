# Synapse — Roadmap

**Last Updated:** April 2026  
**Status convention:** Either **Complete** (shipped on `main`) or **Backlog** (not yet started or in progress). No version sub-labels — version history lives in git, decisions live in [Decision_Log.md](Decision_Log.md).

---

## MVP Complete

The MVP ships the full Knowledge-QA app on the Synapse platform shell:

- **Platform Shell** — AppRegistry, A2UI v0.9, SSE streaming, design tokens, 7 catalog components
- **Knowledge-QA** — RAG pipeline, session persistence, Architect's Triad, rich citations, document ingestion
- **Observability** — LGTM stack (OTel, Loki, Grafana, Tempo, Prometheus) with FE structured logging
- **Testing** — Playwright E2E suite (11/12 passing)
- **Release pipeline** — automated multi-arch (`amd64` + `arm64`) container builds to GHCR with SLSA build-provenance attestations on every `v*.*.*` tag (see [Architecture.md §6](Architecture.md))

---

## Backlog

Items are grouped by capability track. Each track represents a coherent product surface that ships as a unit; ordering within a track reflects natural dependencies, not deadlines.

### 1. Core Ingestion Engine

Strengthen the data-ingest path so that the corpus reflects reality continuously, scales across content types, and is safely partitioned per user.

| Item | Description |
|---|---|
| Hybrid prose/code ingestion | Detect content type per chunk (prose vs. source code vs. structured config) and route to type-specific splitters; preserve code-block boundaries; embed code with a code-aware model where it materially improves retrieval. |
| Incremental hash-based syncing | Hash each chunk at ingest time; on re-upload, compare hashes and update only the differing rows. Replaces the current "DELETE all chunks for `source_file` then reinsert" approach to avoid embedding cost on unchanged content. |
| Project isolation via Supabase RLS | Add `projects` (with `owner_user_id`) and project_id foreign keys on `document_chunks` / `sessions` / `messages`. Enforce isolation via RLS policies keyed off `current_setting('request.jwt.claim.sub')`. Implies real authenticated identity (replaces the current mock bypass on `/ingest`). |

### 2. Reflexive Brain (Triage System)

The second hosted app on the Synapse shell. A capture-first, agent-refined personal knowledge surface, distinct from Knowledge-QA's document-grounded retrieval model.

| Item | Description |
|---|---|
| Frictionless capture | Apple Watch voice-to-text dictation → encrypted upload → ingest queue. Zero-UI capture path so the cost of recording a thought approaches zero. |
| AI refinery (auto-triage) | Background LLM pass classifies each capture as `Task`, `Idea`, or `Blocker` with confidence + rationale; routes to per-class views. Human override always available; classifier learns from overrides. |
| Entity extraction & relationship mapping | LLM extraction pass per capture produces typed entities + relationships; persisted as Neo4j nodes/edges alongside their pgvector embeddings. Enables graph-traversal queries ("what connects X and Y") in addition to vector similarity. |

### 3. Ecosystem & Integration

Extend Synapse beyond its own data store so the corpus and the workspace stay in sync with the rest of a user's tool surface.

| Item | Description |
|---|---|
| Unified management dashboard | Single admin surface for documents, sessions, projects, ingestion jobs, integration health, and per-user OpenAI cost. Currently fragmented across Drawer tabs and Grafana. |
| Bidirectional sync with Confluence/Jira | **Pull:** designated Confluence spaces and Jira projects sync into the Knowledge-QA corpus, dedup'd by source URL, refreshed via webhook within minutes. **Push:** Synapse summaries or insights post back as Confluence pages or Jira comments with stable round-trip identifiers. Resilient to either side's outage; no silent data loss. |

### 4. Platform Operations

Cross-cutting work that doesn't belong to a single capability track but is required for production confidence.

| Item | Description |
|---|---|
| k6 load testing | Three scenarios — RAG query ramp, concurrent sessions, ingest stress — pushing metrics to Prometheus → Grafana k6 dashboard. Makefile targets (`load-test-query`, `load-test-sessions`, `load-test-ingest`) already wired; scenario files and dashboard JSON pending. |
| Hybrid search (vector + FTS + RRF) | GIN FTS index on `document_chunks`, `hybrid_search_chunks` RPC, Python RRF merge in `knowledge_qa_agent.py`. Improves retrieval for queries with strong lexical signal where pure vector similarity underweights exact-term matches. |
| Custom agent templates | Authoring interface for new agents (system prompt, tool catalog, output contract) without writing code. Lowers the cost of adding a fourth, fifth hosted app. |

---

## Tech Debt

| Item | Description |
|---|---|
| SSR fix — knowledge-qa page | `page.tsx` is a Client Component (`'use client'`) due to `dynamic({ ssr: false })` on `KnowledgeQAApp`. Fix: keep `page.tsx` as a Server Component, move `dynamic({ ssr: false })` into a `KnowledgeQAAppClient` wrapper; apply `suppressHydrationWarning` or a `mounted` guard on `usePreferences` localStorage reads and `useSession` async init. |
| Drop unused query params | `/api/agents/knowledge-qa` accepts `category`, `dateFrom`, `dateTo` and the RPC supports `filter_category`/`filter_date_from`/`filter_date_to`, but the FE never sends them. Either wire FE filter UI or remove from BE + RPC. |

---

*Architectural decisions are recorded in [Decision_Log.md](Decision_Log.md). The personal learning plan that anchors to these tracks is in [Learning_Strategy.md](Learning_Strategy.md).*
