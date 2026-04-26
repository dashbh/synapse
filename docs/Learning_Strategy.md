# Learning Strategy — FE Architect → Full Stack Architect

**Author:** Bhabani Prasad Dash  
**Last Updated:** April 2026  
**Status:** Active commitment

---

## Intent

This document is the deliberate practice plan for transitioning from a Frontend Architect role into a Full Stack Architect role, with Synapse as the proving ground. Each focus area below identifies a specific capability gap, the depth required to close it, and the concrete Synapse track in [Roadmap.md](Roadmap.md) that will exercise the skill under real production constraints.

The plan is structured around three focus areas plus a non-negotiable practice rule. Each focus area carries a "shipping bar" — a falsifiable production-grade outcome that proves the skill is real, not just read about.

---

## The Three Focus Areas

| Focus Area | Core Discipline | Synapse Track |
|---|---|---|
| 1. Backend Ground Truth | PostgreSQL · background jobs · API contract design | [Core Ingestion Engine](Roadmap.md) |
| 2. AI Infrastructure | Map-reduce synthesis · knowledge graph navigation | [Reflexive Brain (Triage System)](Roadmap.md) |
| 3. Distributed Systems | Third-party orchestration · production observability | [Ecosystem & Integration](Roadmap.md) |

---

## Focus Area 1: Backend Ground Truth

### The Gap

A Frontend Architect builds excellent intuition for state management, type safety, and client-side performance — but typically delegates schema design, query optimisation, and the lifecycle of long-running operations. Full-Stack ownership requires the database to be a first-class design surface, not a black box behind an ORM.

### Topics to Master

**PostgreSQL — beyond CRUD**
- Row-Level Security: policy expressions, the `USING` vs `WITH CHECK` distinction, JWT-driven `current_setting`, performance implications of policy joins
- pgvector internals: `<=>`, `<->`, `<#>` distance operators and when each is appropriate; `ivfflat` vs `hnsw` index trade-offs; `lists` and `probes` tuning; when the planner falls back to sequential scan
- Locking: row-level vs predicate locks, advisory locks for application-level coordination, deadlock detection
- Query planning fluency: reading `EXPLAIN ANALYZE`, statistics targets, partial indexes, BRIN for append-only tables

**Background job management**
- Patterns: in-process `BackgroundTasks` (Synapse's current `store_messages` approach) vs out-of-process queues (Celery, RQ, Arq), and the boundary at which the latter becomes necessary
- Idempotency: dedup keys, exactly-once vs at-least-once semantics, the cost of getting this wrong
- Retry strategies: exponential backoff with jitter, dead-letter queues, poison message handling
- Observability discipline: every job emits a span, every failure has a structured log line, every retry budget is finite

**API contract design**
- Versioning strategies: URL-versioned vs header-versioned vs evolutionary; the cost of breaking changes
- Streaming: SSE (current), chunked transfer, server-side cancellation, backpressure
- Error envelopes: HTTP status + structured body + correlation ID; the contract for "the request succeeded but the work failed"
- Auth boundaries: where the JWT is verified, where claims propagate to RLS, where service tokens differ from user tokens

### Synapse Anchor — Core Ingestion Engine

The [Core Ingestion Engine](Roadmap.md) track is where this discipline is exercised — specifically the **Project isolation via Supabase RLS** item. Concretely:

- A `projects` table with `owner_user_id` and project_id foreign keys on `document_chunks` / `sessions` / `messages`
- RLS policies keyed off `current_setting('request.jwt.claim.sub')`
- Real authenticated identity replacing the current mock bypass on `/ingest`
- Background job for project deletion that cascades cleanly under load

**Shipping bar:** A malicious user cannot retrieve another user's chunk under any query path, even with direct PostgREST access using their own JWT — verified by an explicit cross-tenant probe in the test suite.

The companion items in the same track — **incremental hash-based syncing** and **hybrid prose/code ingestion** — exercise the background-job and contract-design topics above.

---

## Focus Area 2: AI Infrastructure

### The Gap

Synapse v1 demonstrates a competent linear RAG pipeline: embed → retrieve → prompt → answer. The next class of intelligence problems — synthesising across many documents, reasoning over relationships rather than textual similarity, navigating concepts that aren't textually adjacent — requires fundamentally different architectures. Knowing which to reach for, and when, is the new skill.

### Topics to Master

**Map-reduce for document synthesis**
- Per-document partial summaries (map) → consolidation prompt (reduce)
- Failure modes: lost-in-the-middle on the reduce step, prompt-cost blowup, partial-result handling, mid-flight LLM error recovery
- Variants: refine (sequential), tree-summarise (hierarchical), iterative refinement; choosing based on corpus size and answer fidelity requirements
- Hybrid with retrieval: when to summarise-then-retrieve, when to retrieve-then-summarise

**Knowledge graph navigation (Neo4j)**
- Cypher fundamentals: pattern matching, variable-length paths, `shortestPath`, `apoc.path.expand` for guided traversal
- Indexing: composite indexes, full-text indexes, native vector indexes (Neo4j 5+)
- Modelling decisions: when to use a relationship vs a property; supernode mitigation; bidirectional vs directed edges
- Hybrid retrieval: vector search for entry points, graph traversal for context expansion
- LLM-as-graph-builder: reliably extracting entities and relationships from unstructured text; schema validation; deduping nodes across extractions

**Embedding strategies for graphs**
- Node embeddings (node2vec, GraphSAGE) for similarity that ignores text overlap
- Co-occurrence-driven edge weighting
- When embeddings outperform traversal and vice versa

### Synapse Anchor — Reflexive Brain (Triage System)

The [Reflexive Brain](Roadmap.md) track is where this discipline is exercised — specifically the **Entity extraction & relationship mapping** item. Concretely:

- Each capture flows through an LLM extraction pass that produces typed entities + relationships
- Persisted as Neo4j nodes and edges, alongside their pgvector embeddings in Supabase
- Queries hybridise: vector search for "what notes are relevant to X", graph traversal for "what connects X and Y", map-reduce for "what's the synthesis across everything tagged distributed-systems this quarter"

**Shipping bar:** The system surfaces non-obvious connections that pure vector search misses, validated against a held-out manual annotation set with a defined precision/recall target.

The companion items — **frictionless capture** and **AI refinery (auto-triage)** — exercise the prompt-engineering and classifier-design facets of the same discipline.

---

## Focus Area 3: Distributed Systems

### The Gap

Once a system reaches outside its own database, the failure modes multiply. External APIs rate-limit, return inconsistent data, change behaviour without notice, and live in different timezones. Production observability is what turns "the system is broken somewhere" into "this specific call failed with this specific cause." Both are non-negotiable at Full-Stack Architect altitude.

### Topics to Master

**Third-party API orchestration**
- Authentication: OAuth 2.0 flows (authorisation code, client credentials, device flow), token refresh patterns, secret rotation, scoping
- Rate limiting: exponential backoff, jitter, per-integration request budgets, circuit breakers
- Sync strategies: webhook-driven (push), poll-driven (pull), hybrid; full-sync vs incremental-sync via cursors/deltas; reconciliation jobs to catch missed events
- Idempotency at integration boundaries: deduping inbound webhooks, retry-safe outbound calls, the consequences of getting this wrong
- Confluence/Jira specifics: REST API surface, pagination quirks, the Atlassian Document Format (ADF), webhook payload contracts

**Observability — deepening what's already wired**

Synapse already has the LGTM stack operational (Loki / Grafana / Tempo / Prometheus + OpenTelemetry + structlog) — see [Observability.md](Observability.md). The foundation is in place; the next steps are about depth:

- SLO definition: latency, error-rate, and freshness budgets per service
- Alerting strategy: page-worthy vs ticket-worthy; runbook for every alert
- Trace sampling: head-based vs tail-based; when to always-sample LLM calls
- Cost observability: per-request OpenAI token spend as a first-class metric, not a billing afterthought
- Cross-boundary correlation: propagating `trace_id` through external API calls when they support W3C Trace Context, and structured fallback when they don't

**Production discipline**
- Runbook for every alert (an alert without a runbook is technical debt)
- Game days for cascade-failure scenarios
- Capacity planning from observed metrics, not back-of-envelope estimates

### Synapse Anchor — Ecosystem & Integration

The [Ecosystem & Integration](Roadmap.md) track is where this discipline is exercised — specifically the **Bidirectional sync with Confluence/Jira** item. Concretely:

- **Pull:** periodic sync of designated Confluence spaces and Jira projects into the Knowledge-QA vector store, dedup'd by source URL
- **Push:** Synapse summaries post back as Confluence pages or Jira comments, with proper attribution and stable round-trip identifiers
- **Webhooks:** Confluence/Jira changes trigger incremental re-ingest within minutes
- **Resilience:** API outages are observable, recoverable, and don't block the primary user flow

**Shipping bar:** A Confluence page edit reliably appears in Knowledge-QA retrieval within 5 minutes; outage of either side never produces silent data loss; per-integration latency and error rate are first-class panels in Grafana with named SLOs.

The companion item — **unified management dashboard** — exercises the operations-surface and SLO-design facets of the same discipline.

---

## The 10% Manual Refactoring Rule

### The Commitment

For every meaningful chunk of AI-generated backend code that lands in Synapse, **at least 10% will be refactored by hand — without LLM assistance — within the same week.**

### Why

The risk in AI-augmented engineering isn't that the generated code is wrong. It's that the engineer slowly becomes a code reviewer rather than a code author. Reviewing and authoring are different skills. Architectural intuition decays the same way an athlete's reflexes decay without practice — silently, until a moment when it's needed and isn't there.

The 10% rule is a deliberate counterweight: a non-negotiable practice quota that keeps the muscles for naming, decomposition, abstraction, and trade-off analysis active. The point is not to gatekeep AI output. The point is to remain the kind of engineer who can write the system, not just direct one.

### The Shape of the Practice

1. Pick a unit of working AI-generated code — a route handler, a pipeline step, a query builder, a background task
2. With no LLM open: rewrite it from scratch using only the contract (inputs, outputs, side effects, error modes)
3. Compare against the original: where did the AI version differ, and on what axis (clarity, performance, testability, idiomatic style)?
4. Keep the better one — or merge the better halves
5. Log the lesson: what did this surface about the system that wasn't obvious before?

### What This Is Not

- Not gatekeeping AI output — the goal is more leverage, not less
- Not retrospective second-guessing — the AI version was probably fine
- Not a productivity drag — time spent here compounds into faster, more confident review of the remaining 90%

### Signals That It's Working

- In PR review, root causes surface faster
- In design discussions, second-order effects are anticipated more reliably
- In incident debugging, the right place to look is intuited without `grep`

---

## Cadence & Review

| Frequency | Activity |
|---|---|
| Weekly | One concrete thing learned per focus area, captured in a personal log |
| Per Roadmap track milestone | Honest self-assessment against the matched focus area's shipping bar |
| Quarterly | Re-read this document; update the gap statements based on what was actually hard |

The plan adapts. The commitment doesn't.

---

*The formal project backlog and tracks live in [Roadmap.md](Roadmap.md). Significant technical decisions are recorded in [Decision_Log.md](Decision_Log.md).*
