# Synapse — Roadmap

---

## MVP Complete

The MVP ships the full Knowledge-QA app on the Synapse platform shell:

- Platform Shell (AppRegistry, A2UI v0.9, SSE streaming, design tokens, 7 catalog components)
- Knowledge-QA: RAG pipeline, session persistence, Architect's Triad, rich citations, document ingestion
- LGTM observability stack (OTel, Loki, Grafana, Tempo, Prometheus) with FE structured logging
- Playwright E2E test suite (11/12 passing)

---

## Backlog

Items grouped by domain. No priority order implied.

| Domain | Item | Description |
|--------|------|-------------|
| Knowledge-QA | Hybrid Search | GIN FTS index on `document_chunks` + `hybrid_search_chunks` RPC + Python RRF merge in `knowledge_qa_agent.py` |
| Infrastructure | k6 Load Testing | 3 scenarios: RAG query ramp, concurrent sessions, ingest stress → Prometheus remote write → Grafana k6 dashboard. Makefile targets (`load-test-query`, `load-test-sessions`, `load-test-ingest`) already wired. |
| Platform | Reflexive-Brain app | Quick capture, global search, agentic triage |
| Platform | Real admin auth | OAuth/SAML replacing mock bypass on `/ingest` |
| Platform | Implicit Ingestion | Automated watcher for cloud/local folder sync |
| Platform | Custom agent templates | — |
| Platform | Multi-workspace support | — |
| Platform | Cloud sync | Document versioning + sharing |

---

## Tech Debt

| Item | Description |
|------|-------------|
| SSR fix — knowledge-qa page | `page.tsx` is a Client Component (`'use client'`) due to `dynamic({ ssr: false })` on `KnowledgeQAApp`. Fix: keep `page.tsx` as a Server Component, move `dynamic({ ssr: false })` into a `KnowledgeQAAppClient` wrapper; apply `suppressHydrationWarning` or a `mounted` guard on `usePreferences` localStorage reads and `useSession` async init. |
| Drop unused query params | `/api/agents/knowledge-qa` accepts `category`, `dateFrom`, `dateTo` and the RPC supports `filter_category`/`filter_date_from`/`filter_date_to`, but the FE never sends them. Either wire FE filter UI or remove from BE + RPC. |
